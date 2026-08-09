import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // ============================================================
  // MIDDLEWARE CORS MANUAL (PRIMEIRO DA PILHA)
  // Garante que TODA resposta — incluindo erros 502 do Render, respostas
  // do ValidationPipe, etc. — tenha o header Access-Control-Allow-Origin.
  // O app.enableCors() do NestJS adiciona headers SÓ em respostas normais,
  // não em respostas abortadas pelo framework antes do controller.
  // ============================================================
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://cija-backend.onrender.com',
    'https://projeto-cija.vercel.app',
    'https://projeto-cija.vercel.app/',
    // Domínios comuns adicionais
    'https://cija-app.vercel.app',
    'https://cija-frontend.vercel.app',
    'https://cija.netlify.app',
    // Adicione aqui a URL exata do seu front em produção
    ...(process.env.FRONTEND_URLS || '')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, '')) // remove trailing slash
      .filter(Boolean),
  ];

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With,Accept,Origin',
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Length,Content-Disposition',
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Credentials', 'false');

    // Log de origens não-conhecidas em produção (para auditoria)
    if (
      origin &&
      !allowedOrigins.includes(origin) &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      console.warn(
        `[CORS] Origem não-allowlist acessou: ${origin} | rota: ${req.method} ${req.path}`,
      );
    }

    // Responde preflight (OPTIONS) imediatamente
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });

  // O middleware acima já cuida de TODA a lógica de CORS, incluindo preflight.
  // Não chamamos app.enableCors() para não duplicar headers (e evitar conflito
  // entre Access-Control-Allow-Origin: * e credentials).

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Timeout generoso para o Gemini (free tier pode demorar)
  const server = app.getHttpServer();
  server.setTimeout(120_000);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');

  console.log(`[Backend] Rodando na porta ${port}`);
  console.log(`[Backend] CORS liberado para:`);
  allowedOrigins.forEach((o) => console.log(`  - ${o}`));
  console.log(`[Backend] + qualquer localhost/127.0.0.`);
}
bootstrap();
