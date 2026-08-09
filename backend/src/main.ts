import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

// Origens permitidas pelo backend.
// Frontend local (CRA): http://localhost:3000
// Backend local: http://localhost:3001
// Produção: https://cija-backend.onrender.com
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://cija-backend.onrender.com',
];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // CORS com whitelist explícita. Usar '*' com credentials: true é
  // rejeitado pelos navegadores (a spec exige uma origem concreta quando
  // há credenciais). Mantemos credentials: true por causa do JWT/cookies.
  app.enableCors({
    origin: (origin, callback) => {
      // Requisições sem header Origin (mesma origem, curl, server-to-server)
      // são permitidas. O navegador sempre envia Origin em requests
      // cross-origin, então a checagem real acontece para o frontend.
      // String() garante tipagem segura — a callback do enableCors tipa
      // origin como any por padrão.
      const originStr = origin ? String(origin) : '';
      if (!originStr || allowedOrigins.includes(originStr)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        callback(null, true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        callback(new Error(`Origin ${originStr} não permitida por CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    // Expõe Content-Disposition para o frontend conseguir ler o nome
    // do arquivo PDF gerado em /pdf/curriculo.
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  // Middleware dedicado para preflight (OPTIONS).
  // Defesa em profundidade: garante que o preflight seja respondido
  // mesmo se o CORS do NestJS falhar em algum edge case (ex: headers
  // customizados, Authorization, cookies).
  app.use((req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT || 3001);

  // garantir que o servidor aceite conexões externas no Render
  await app.listen(port, '0.0.0.0');

  console.log(`Servidor rodando na porta ${port}`);
}

void bootstrap();
