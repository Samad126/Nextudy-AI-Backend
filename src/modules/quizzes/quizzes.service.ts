import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { QuizGradingService } from './quiz-grading.service.js';
import { QuizzesRepository } from './quizzes.repository.js';
import { WorkspacesRepository } from '../workspaces/workspaces.repository.js';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private readonly repo: QuizzesRepository,
    private readonly workspacesRepo: WorkspacesRepository,
    private readonly gradingService: QuizGradingService,
  ) {}

  async create(userId: number, createQuizDto: CreateQuizDto) {
    const { workspaceId, title, description, questionIds } = createQuizDto;

    const workspace = await this.workspacesRepo.findWorkspaceAsEditor(
      workspaceId,
      userId,
    );
    if (!workspace) throw new ForbiddenException('Access denied');

    const questions = await this.repo.findQuestionsByIds(questionIds);

    if (questions.length !== questionIds.length) {
      const foundIds = questions.map((q) => q.id);
      const missing = questionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Questions not found: ${missing.join(', ')}`,
      );
    }

    this.logger.log(`Creating quiz in workspace ${workspaceId}`);
    return this.repo.createQuiz({
      workspaceId,
      title,
      description,
      questionIds,
    });
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.workspacesRepo.findWorkspaceAsMember(
      workspaceId,
      userId,
    );
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.repo.findAllQuizzes(workspaceId, userId);
  }

  async findOne(userId: number, id: number) {
    const quiz = await this.repo.findOneQuiz(id, userId);
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async remove(userId: number, id: number) {
    const quiz = await this.repo.findQuizAsEditor(id, userId);
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.repo.deleteQuiz(id);
    this.logger.log(`Quiz ${id} deleted`);
    return { message: 'Quiz deleted successfully' };
  }

  // ============= ATTEMPTS =============

  async submitAttempt(
    userId: number,
    quizId: number,
    submitDto: SubmitQuizDto,
  ) {
    const quiz = await this.repo.findQuizForSubmission(quizId, userId);
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
      const isCorrect = this.gradingService.gradeAnswer(
        qq.question,
        userAnswer,
      );
      return { quizQuestionId, userAnswer: String(userAnswer), isCorrect };
    });

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);

    return this.repo.createAttemptWithAnswers({
      quizId,
      userId,
      score,
      answers,
    });
  }

  async getAttempts(userId: number, quizId: number) {
    const quiz = await this.repo.findOneQuiz(quizId, userId);
    if (!quiz) throw new NotFoundException('Quiz not found');

    return this.repo.findAttempts(quizId, userId);
  }

  async getAttempt(userId: number, quizId: number, attemptId: number) {
    const attempt = await this.repo.findAttempt(attemptId, quizId, userId);
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }
}
