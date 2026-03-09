import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';

@ApiBearerAuth('accessToken')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a quiz from question IDs' })
  create(@GetUser('sub') userId: number, @Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(userId, createQuizDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes in a workspace' })
  findAll(
    @GetUser('sub') userId: number,
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    return this.quizzesService.findAll(userId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quiz by ID' })
  findOne(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizzesService.findOne(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quiz' })
  remove(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizzesService.remove(userId, id);
  }
}
