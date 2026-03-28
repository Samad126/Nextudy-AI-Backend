import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';
import { UpdateFlashcardSetDto } from './dto/update-flashcard-set.dto.js';
import { UpdateFlashcardCardDto } from './dto/update-flashcard-card.dto.js';
import { Difficulty } from '../../../generated/prisma/client.js';

const setInclude = {
  cards: { orderBy: { created_at: 'asc' as const } },
  resources: { include: { resource: true } },
} as const;

@Injectable()
export class FlashcardsRepository {
  constructor(private readonly db: DatabaseService) {}

  createSet(
    workspaceId: number,
    title: string,
    description: string | undefined,
    cards: {
      question: string;
      answer: string;
      difficulty: Difficulty | null;
    }[],
    resourceIds: number[],
  ) {
    return this.db.flashcardSet.create({
      data: {
        workspaceId,
        title,
        description,
        cards: {
          create: cards.map((c) => ({
            question: c.question,
            answer: c.answer,
            difficulty: c.difficulty,
          })),
        },
        resources: {
          create: resourceIds.map((resourceId) => ({ resourceId })),
        },
      },
      include: setInclude,
    });
  }

  findAll(workspaceId: number) {
    return this.db.flashcardSet.findMany({
      where: { workspaceId },
      include: setInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  findOneAsMember(id: number, userId: number) {
    return this.db.flashcardSet.findFirst({
      where: { id, workspace: { ...anyMemberFilter(userId) } },
      include: setInclude,
    });
  }

  findOneAsEditor(id: number, userId: number) {
    return this.db.flashcardSet.findFirst({
      where: { id, workspace: { ...ownerOrEditorFilter(userId) } },
    });
  }

  updateSet(id: number, dto: UpdateFlashcardSetDto) {
    return this.db.flashcardSet.update({
      where: { id },
      data: dto,
      include: setInclude,
    });
  }

  updateSetWithResources(
    id: number,
    dto: Omit<UpdateFlashcardSetDto, 'resourceIds'>,
    resourceIds: number[],
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.flashcardResource.deleteMany({ where: { flashcardSetId: id } });
      return tx.flashcardSet.update({
        where: { id },
        data: {
          ...dto,
          resources: {
            create: resourceIds.map((resourceId) => ({ resourceId })),
          },
        },
        include: setInclude,
      });
    });
  }

  deleteSet(id: number) {
    return this.db.flashcardSet.delete({ where: { id } });
  }

  findCardAsEditor(cardId: number, userId: number) {
    return this.db.flashcard.findFirst({
      where: {
        id: cardId,
        set: { workspace: { ...ownerOrEditorFilter(userId) } },
      },
    });
  }

  updateCard(cardId: number, dto: UpdateFlashcardCardDto) {
    return this.db.flashcard.update({
      where: { id: cardId },
      data: dto,
    });
  }

  deleteCard(cardId: number) {
    return this.db.flashcard.delete({ where: { id: cardId } });
  }
}
