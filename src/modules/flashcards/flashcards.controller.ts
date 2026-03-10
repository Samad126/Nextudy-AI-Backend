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
import { CreateFlashcardDto } from './dto/create-flashcard.dto.js';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';

@ApiBearerAuth('accessToken')
@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a flashcard with resources' })
  create(
    @GetUser('sub') userId: number,
    @Body() createFlashcardDto: CreateFlashcardDto,
  ) {
    return this.flashcardsService.create(userId, createFlashcardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all flashcards in a workspace' })
  findAll(
    @GetUser('sub') userId: number,
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    return this.flashcardsService.findAll(userId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flashcard by ID' })
  findOne(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flashcard' })
  update(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFlashcardDto: UpdateFlashcardDto,
  ) {
    return this.flashcardsService.update(userId, id, updateFlashcardDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard' })
  remove(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardsService.remove(userId, id);
  }
}
