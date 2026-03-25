import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { QuestionsService } from './questions.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { RegenerateQuestionDto } from './dto/regenerate-question.dto.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { Throttle } from '@nestjs/throttler';

@Controller('questions')
@ApiBearerAuth('accessToken')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Create new questions' })
  create(
    @GetUser('sub') userId: number,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(userId, createQuestionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all questions for a workbench' })
  findAll(
    @GetUser('sub') userId: number,
    @Query('workbenchId', ParseIntPipe) workbenchId: number,
  ) {
    return this.questionsService.findAll(userId, workbenchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a question (title, difficulty, MCQ choices, open-ended answer)' })
  update(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(userId, id, updateQuestionDto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate a single question' })
  regenerate(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegenerateQuestionDto,
  ) {
    return this.questionsService.regenerate(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question' })
  remove(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.questionsService.remove(userId, id);
  }
}
