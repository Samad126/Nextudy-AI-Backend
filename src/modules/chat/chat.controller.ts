import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';

@ApiBearerAuth('accessToken')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat session' })
  create(@GetUser('sub') userId: number, @Body() dto: CreateChatDto) {
    return this.chatService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all chats for a workbench' })
  findAll(
    @GetUser('sub') userId: number,
    @Query('workbenchId', ParseIntPipe) workbenchId: number,
  ) {
    return this.chatService.findAll(userId, workbenchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat with all messages' })
  findOne(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatService.findOne(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chat session' })
  remove(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatService.remove(userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message and get AI response' })
  sendMessage(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, id, dto);
  }
}
