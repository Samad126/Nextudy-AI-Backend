import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@ApiBearerAuth('accessToken')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  getAll(@GetUser('sub') userId: number) {
    return this.notificationsService.getAll(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@GetUser('sub') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post('invites/:inviteId/accept')
  @ApiOperation({ summary: 'Accept a workspace invite' })
  acceptInvite(
    @GetUser('sub') userId: number,
    @Param('inviteId', ParseIntPipe) inviteId: number,
  ) {
    return this.notificationsService.respondToInvite(
      userId,
      inviteId,
      'accept',
    );
  }

  @Post('invites/:inviteId/reject')
  @ApiOperation({ summary: 'Reject a workspace invite' })
  rejectInvite(
    @GetUser('sub') userId: number,
    @Param('inviteId', ParseIntPipe) inviteId: number,
  ) {
    return this.notificationsService.respondToInvite(
      userId,
      inviteId,
      'reject',
    );
  }
}
