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
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
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
  @ApiOperation({ summary: 'Get a quiz by ID with full question details' })
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

  // ============= ATTEMPTS =============

  @Post(':id/attempts/submit')
  @ApiOperation({ summary: 'Submit answers for a quiz' })
  submitAttempt(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) quizId: number,
    @Body() submitDto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitAttempt(userId, quizId, submitDto);
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'Get all attempts for a quiz (current user)' })
  getAttempts(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) quizId: number,
  ) {
    return this.quizzesService.getAttempts(userId, quizId);
  }

  @Get(':id/attempts/:attemptId')
  @ApiOperation({ summary: 'Get a specific attempt with answers' })
  getAttempt(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) quizId: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
  ) {
    return this.quizzesService.getAttempt(userId, quizId, attemptId);
  }
}
