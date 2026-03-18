import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto.js';
import { Difficulty } from '../../../generated/prisma/client.js';

const resourcesInclude = {
  resources: { include: { resource: true } },
} as const;

@Injectable()
export class FlashcardsRepository {
  constructor(private readonly db: DatabaseService) {}

  createMany(
    workspaceId: number,
    flashcards: {
      question: string;
      answer: string;
      difficulty: Difficulty | null;
    }[],
    resourceIds: number[],
  ) {
    return this.db.$transaction(async (tx) => {
      const flashcardRows = await tx.flashcard.createManyAndReturn({
        data: flashcards.map((f) => ({
          workspaceId,
          question: f.question,
          answer: f.answer,
          difficulty: f.difficulty,
        })),
      });

      await tx.flashcardResource.createMany({
        data: flashcardRows.flatMap((fc) =>
          resourceIds.map((resourceId) => ({
            flashcardId: fc.id,
            resourceId,
          })),
        ),
      });

      return tx.flashcard.findMany({
        where: { id: { in: flashcardRows.map((fc) => fc.id) } },
        include: resourcesInclude,
      });
    });
  }

  findAll(workspaceId: number) {
    return this.db.flashcard.findMany({
      where: { workspaceId },
      include: resourcesInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  findOneAsMember(id: number, userId: number) {
    return this.db.flashcard.findFirst({
      where: { id, workspace: { ...anyMemberFilter(userId) } },
      include: resourcesInclude,
    });
  }

  findOneAsEditor(id: number, userId: number) {
    return this.db.flashcard.findFirst({
      where: { id, workspace: { ...ownerOrEditorFilter(userId) } },
    });
  }

  updateWithResources(
    id: number,
    scalars: Omit<UpdateFlashcardDto, 'resourceIds'>,
    resourceIds: number[],
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.flashcardResource.deleteMany({ where: { flashcardId: id } });
      return tx.flashcard.update({
        where: { id },
        data: {
          ...scalars,
          resources: {
            create: resourceIds.map((resourceId) => ({ resourceId })),
          },
        },
        include: resourcesInclude,
      });
    });
  }

  update(id: number, scalars: Omit<UpdateFlashcardDto, 'resourceIds'>) {
    return this.db.flashcard.update({
      where: { id },
      data: scalars,
      include: resourcesInclude,
    });
  }

  delete(id: number) {
    return this.db.flashcard.delete({ where: { id } });
  }
}
