import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const httpLogger = new Logger('HTTP');

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      res.setHeader('X-Response-Time', `${ms}ms`);
      if (ms >= 400) {
        httpLogger.log(
          `${req.method} ${req.originalUrl ?? (req as Request & { url?: string }).url ?? ''} ${res.statusCode} ${ms}ms`,
        );
      }
    });
    next();
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL', 'http://localhost:3000'),
      'http://localhost:3001',
      'http://localhost:8081', // Expo dev server
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('E Vision API')
    .setDescription('Multi-Shop E-Commerce + Electrician Service Platform — E Vision Pvt. Ltd.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT', 4000);
  await app.listen(port);
  console.log(`\n⚡ E Vision API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();
