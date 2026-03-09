import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
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
          include: { question: true },
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
        questions: {
          include: { question: true },
        },
      },
    });
  }

  async findOne(userId: number, id: number) {
    const quiz = await this.db.quiz.findFirst({
      where: { id, workspace: { ...anyMemberFilter(userId) } },
      include: {
        questions: {
          include: { question: true },
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
}
