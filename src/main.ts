import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

class CorsIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): Server {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
        credentials: true,
      },
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new CorsIoAdapter(app));

  app.use(helmet());

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // if (process.env.NODE_ENV !== 'production') {

  // }

  const config = new DocumentBuilder()
    .setTitle('Nextudy Backend Api')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'accessToken', // Name for the security scheme (used in @ApiBearerAuth())
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
