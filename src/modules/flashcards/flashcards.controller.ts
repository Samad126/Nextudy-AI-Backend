import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FlashcardsService } from './flashcards.service.js';
import { CreateFlashcardSetDto } from './dto/create-flashcard-set.dto.js';
import { UpdateFlashcardSetDto } from './dto/update-flashcard-set.dto.js';
import { UpdateFlashcardCardDto } from './dto/update-flashcard-card.dto.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';

@ApiBearerAuth('accessToken')
@Controller('flashcard-sets')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a flashcard set with AI-generated cards' })
  createSet(
    @GetUser('sub') userId: number,
    @Body() dto: CreateFlashcardSetDto,
  ) {
    return this.flashcardsService.createSet(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all flashcard sets in a workspace' })
  findAll(
    @GetUser('sub') userId: number,
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    return this.flashcardsService.findAll(userId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flashcard set by ID' })
  findOne(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flashcard set (title, description, resources)' })
  updateSet(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFlashcardSetDto,
  ) {
    return this.flashcardsService.updateSet(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard set and all its cards' })
  removeSet(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardsService.removeSet(userId, id);
  }

  @Patch(':id/cards/:cardId')
  @ApiOperation({ summary: 'Update an individual flashcard card' })
  updateCard(
    @GetUser('sub') userId: number,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() dto: UpdateFlashcardCardDto,
  ) {
    return this.flashcardsService.updateCard(userId, cardId, dto);
  }

  @Delete(':id/cards/:cardId')
  @ApiOperation({ summary: 'Delete an individual flashcard card' })
  removeCard(
    @GetUser('sub') userId: number,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    return this.flashcardsService.removeCard(userId, cardId);
  }
}
