import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class QuizzesRepository {
  constructor(private readonly db: DatabaseService) {}

  findQuestionsByIds(questionIds: number[]) {
    return this.db.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });
  }

  createQuiz(data: {
    workspaceId: number;
    title: string;
    description?: string;
    questionIds: number[];
  }) {
    return this.db.quiz.create({
      data: {
        workspaceId: data.workspaceId,
        title: data.title,
        description: data.description,
        questions: {
          create: data.questionIds.map((questionId) => ({ questionId })),
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

  findAllQuizzes(workspaceId: number, userId: number) {
    return this.db.quiz.findMany({
      where: { workspaceId, workspace: { ...anyMemberFilter(userId) } },
      include: {
        questions: { select: { id: true } },
        _count: { select: { attempts: true } },
      },
    });
  }

  findOneQuiz(id: number, userId: number) {
    return this.db.quiz.findFirst({
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
  }

  findQuizAsEditor(id: number, userId: number) {
    return this.db.quiz.findFirst({
      where: { id, workspace: { ...ownerOrEditorFilter(userId) } },
    });
  }

  deleteQuiz(id: number) {
    return this.db.quiz.delete({ where: { id } });
  }

  findQuizForSubmission(quizId: number, userId: number) {
    return this.db.quiz.findFirst({
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
  }

  createAttemptWithAnswers(data: {
    quizId: number;
    userId: number;
    score: number;
    answers: {
      quizQuestionId: number;
      userAnswer: string;
      isCorrect: boolean;
    }[];
  }) {
    return this.db.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          quizId: data.quizId,
          userId: data.userId,
          score: data.score,
          completed_at: new Date(),
        },
      });

      await tx.userQuizAnswer.createMany({
        data: data.answers.map((a) => ({ ...a, attemptId: attempt.id })),
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

  findAttempts(quizId: number, userId: number) {
    return this.db.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { started_at: 'desc' },
      include: {
        _count: { select: { answers: true } },
      },
    });
  }

  findAttempt(attemptId: number, quizId: number, userId: number) {
    return this.db.quizAttempt.findFirst({
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
  }
}
