import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class QuizzesService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: number, createQuizDto: CreateQuizDto) {
    const { workspaceId, title, description, questionIds } = createQuizDto;

    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    const questions = await this.db.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });

    if (questions.length !== questionIds.length) {
      const foundIds = questions.map((q) => q.id);
      const missing = questionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Questions not found: ${missing.join(', ')}`,
      );
    }

    return this.db.quiz.create({
      data: {
        workspaceId,
        title,
        description,
        questions: {
          create: questionIds.map((questionId) => ({ questionId })),
        },
      },
      include: {
        questions: {
          include: {
            question: {
              include: { mcqChoices: true, openEndedAnswer: true },
            },
          },
        },
      },
    });
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.db.quiz.findMany({
      where: { workspaceId },
      include: {
        questions: { select: { id: true } },
        _count: { select: { attempts: true } },
      },
    });
  }

  async findOne(userId: number, id: number) {
    const quiz = await this.db.quiz.findFirst({
      where: { id, workspace: { ...anyMemberFilter(userId) } },
      include: {
        questions: {
          include: {
            question: {
              include: { mcqChoices: true, openEndedAnswer: true },
            },
          },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async remove(userId: number, id: number) {
    const quiz = await this.db.quiz.findFirst({
      where: { id, workspace: { ...ownerOrEditorFilter(userId) } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.db.quiz.delete({ where: { id } });
    return { message: 'Quiz deleted successfully' };
  }

  // ============= ATTEMPTS =============

  async submitAttempt(
    userId: number,
    quizId: number,
    submitDto: SubmitQuizDto,
  ) {
    const quiz = await this.db.quiz.findFirst({
      where: { id: quizId, workspace: { ...anyMemberFilter(userId) } },
      include: {
        questions: {
          include: {
            question: {
              include: {
                mcqChoices: true,
                openEndedAnswer: { include: { gradingKeywords: true } },
              },
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    const quizQuestionMap = new Map(quiz.questions.map((qq) => [qq.id, qq]));

    const submittedIds = submitDto.answers.map((a) => a.quizQuestionId);
    const invalidIds = submittedIds.filter((id) => !quizQuestionMap.has(id));
    if (invalidIds.length)
      throw new BadRequestException(
        `Invalid quiz question IDs: ${invalidIds.join(', ')}`,
      );

    const answers = submitDto.answers.map(({ quizQuestionId, userAnswer }) => {
      const qq = quizQuestionMap.get(quizQuestionId)!;
      const isCorrect = this.gradeAnswer(qq.question, userAnswer);
      return { quizQuestionId, userAnswer: String(userAnswer), isCorrect };
    });

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);

    return this.db.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: { quizId, userId, score, completed_at: new Date() },
      });

      await tx.userQuizAnswer.createMany({
        data: answers.map((a) => ({ ...a, attemptId: attempt.id })),
      });

      return tx.quizAttempt.findUnique({
        where: { id: attempt.id },
        include: {
          answers: {
            include: { quizQuestion: { include: { question: true } } },
          },
        },
      });
    });
  }

  async getAttempts(userId: number, quizId: number) {
    const quiz = await this.db.quiz.findFirst({
      where: { id: quizId, workspace: { ...anyMemberFilter(userId) } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    return this.db.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { started_at: 'desc' },
      include: {
        _count: { select: { answers: true } },
      },
    });
  }

  async getAttempt(userId: number, quizId: number, attemptId: number) {
    const attempt = await this.db.quizAttempt.findFirst({
      where: { id: attemptId, quizId, userId },
      include: {
        answers: {
          include: {
            quizQuestion: {
              include: {
                question: {
                  include: { mcqChoices: true, openEndedAnswer: true },
                },
              },
            },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  // ============= PRIVATE =============

  private gradeAnswer(
    question: {
      question_type: string;
      mcqChoices: { id: number; is_correct: boolean }[];
      openEndedAnswer: {
        gradingKeywords: { keyword: string; is_required: boolean }[];
      } | null;
    },
    userAnswer: string | number,
  ): boolean {
    if (question.question_type === 'mcq') {
      const choiceId =
        typeof userAnswer === 'number' ? userAnswer : parseInt(userAnswer, 10);
      if (isNaN(choiceId)) return false;
      const choice = question.mcqChoices.find((c) => c.id === choiceId);
      return choice?.is_correct ?? false;
    }

    // open_ended: check required keywords
    if (question.openEndedAnswer?.gradingKeywords.length) {
      const lower = String(userAnswer).toLowerCase();
      const requiredKeywords = question.openEndedAnswer.gradingKeywords.filter(
        (k) => k.is_required,
      );
      if (requiredKeywords.length) {
        return requiredKeywords.every((k) =>
          lower.includes(k.keyword.toLowerCase()),
        );
      }
      // No required keywords — check if any keyword matches
      return question.openEndedAnswer.gradingKeywords.some((k) =>
        lower.includes(k.keyword.toLowerCase()),
      );
    }

    return false;
  }
}
