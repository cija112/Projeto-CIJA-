import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  // ============================================================
  // CRIAÇÃO DA APLICAÇÃO
  // ============================================================

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // ============================================================
  // COOKIE PARSER
  // ============================================================

  app.use(cookieParser());

  // ============================================================
  // VALIDATION PIPE
  // ============================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ============================================================
  // CONFIGURAÇÃO DO SERVIDOR
  // ============================================================

  const server = app.getHttpServer();

  // Timeout de 2 minutos
  server.setTimeout(120_000);

  // Mantém conexões abertas por 65 segundos
  server.keepAliveTimeout = 65_000;

  // Timeout dos headers
  server.headersTimeout = 66_000;

  const port = Number(process.env.PORT || 3001);

  // ============================================================
  // INICIA O SERVIDOR
  // ============================================================

  await app.listen(port, '0.0.0.0');

  // ============================================================
  // LOGS
  // ============================================================

  Logger.log(`Backend rodando na porta ${port}`, 'Bootstrap');

  Logger.log(`Servidor disponível em 0.0.0.0:${port}`, 'Bootstrap');
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

bootstrap().catch((error: unknown) => {
  Logger.error(
    'Erro fatal ao iniciar o backend',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );

  process.exit(1);
});
