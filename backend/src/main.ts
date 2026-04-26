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
    const origEnd = res.end.bind(res);
    res.end = function (...args: Parameters<typeof res.end>) {
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
      }
      return origEnd(...args);
    } as typeof res.end;

    res.on('finish', () => {
      const ms = Date.now() - start;
      const path = req.originalUrl ?? (req as Request & { url?: string }).url ?? '';
      if (ms >= 800) {
        httpLogger.warn(`${req.method} ${path} ${res.statusCode} ${ms}ms`);
      } else if (ms >= 250) {
        httpLogger.log(`${req.method} ${path} ${res.statusCode} ${ms}ms`);
      }
    });
    next();
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const trust = String(configService.get('TRUST_PROXY', '') || '').toLowerCase();
  if (['1', 'true', 'yes'].includes(trust)) {
    const httpServer = app.getHttpAdapter().getInstance() as { set?: (k: string, v: unknown) => void };
    httpServer?.set?.('trust proxy', 1);
  }

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
    .setTitle('E vision API')
    .setDescription('Multi-Shop E-Commerce + Electrician Service Platform — E vision Pvt. Ltd.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT', 8000);
  const host = configService.get('HOST', '127.0.0.1');
  await app.listen(port, host);
  console.log(`\n⚡ E vision API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();
