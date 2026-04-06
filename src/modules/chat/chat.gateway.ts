import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

type AuthSocket = Omit<Socket, 'data'> & { data: { user: JwtPayload } };
import { ChatService } from './chat.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@WebSocketGateway({ namespace: 'chat', cors: false })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const payload = await this.authenticate(client);
      client.data.user = payload;
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated connection: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private async authenticate(client: AuthSocket): Promise<JwtPayload> {
    const token = this.extractToken(client);
    if (!token) throw new Error('No token provided');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });

    if (payload.jti && (await this.redis.exists(`bl:${payload.jti}`))) {
      throw new Error('Token has been revoked');
    }

    return payload;
  }

  private extractToken(client: AuthSocket): string | null {
    // 1. socket.io handshake auth: { token: '...' }
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    // 2. Authorization: Bearer <token> header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    return null;
  }

  @SubscribeMessage('chat:sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { chatId: number; content: string },
  ) {
    const user = client.data.user;

    try {
      const assistantMsg = await this.chatService.streamSendMessage(
        user.sub,
        payload.chatId,
        { content: payload.content },
        (userMsg) => client.emit('chat:userMessage', userMsg),
        (chunk) => client.emit('chat:chunk', { chatId: payload.chatId, chunk }),
      );

      client.emit('chat:message', assistantMsg);
    } catch (error) {
      client.emit('chat:error', {
        message: (error as Error).message || 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('chat:editMessage')
  async handleEditMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: { chatId: number; messageId: number; content: string },
  ) {
    const user = client.data.user;

    try {
      const assistantMsg = await this.chatService.streamEditMessage(
        user.sub,
        payload.chatId,
        payload.messageId,
        { content: payload.content },
        (userMsg) => client.emit('chat:userMessage', userMsg),
        (chunk) => client.emit('chat:chunk', { chatId: payload.chatId, chunk }),
      );

      client.emit('chat:message', assistantMsg);
    } catch (error) {
      client.emit('chat:error', {
        message: (error as Error).message || 'Failed to edit message',
      });
    }
  }
}
