import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

/**
 * Helper que aplica os headers CORS em uma resposta, com base na origem
 * informada. Reutilizado tanto pelo middleware manual quanto pelo filtro
 * de exceções, para que toda resposta — inclusive as geradas pelo NestJS
 * após o middleware — carregue Access-Control-Allow-Origin.
 */
const aplicarHeadersCors = (
  req: Request,
  res: Response,
  allowedOrigins: string[],
): void => {
  const origin = req.headers.origin;

  if (origin) {
    // Espelha o Origin exatamente (recomendado quando credentials=false
    // ou para compatibilidade com preflight). O navegador aceita o valor
    // desde que case com o Origin enviado.
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    // Sem Origin (chamadas server-to-server, curl), libera geral.
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

  if (
    origin &&
    !allowedOrigins.includes(origin) &&
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    Logger.warn(
      `[CORS] Origem não-allowlist acessou: ${origin} | rota: ${req.method} ${req.path}`,
      'CORS',
    );
  }
};

/**
 * Filtro de exceções global que garante que QUALQUER erro gerado pelo
 * NestJS (incluindo ValidationPipe, BadRequestException, 404, 500, etc.)
 * ainda saia com os headers CORS — porque após uma exceção o framework
 * pode escrever a resposta sem passar pelo middleware Express.
 */
@Catch()
export class CorsAwareExceptionFilter implements ExceptionFilter {
  constructor(private readonly allowedOrigins: string[]) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // Status: se for HttpException, usa o status dela; senão 500.
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Body no mesmo formato que o NestJS usa por padrão.
    let body: Record<string, unknown>;
    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      body =
        typeof r === 'object' && r !== null
          ? (r as Record<string, unknown>)
          : { message: r };
    } else if (exception instanceof Error) {
      body = { message: exception.message, error: 'Internal Server Error' };
      Logger.error(
        `[CORS-Filter] Erro não tratado: ${exception.message}`,
        exception.stack,
        'CORS',
      );
    } else {
      body = { message: 'Erro desconhecido' };
    }

    // Aplica CORS ANTES de qualquer escrita no body.
    try {
      aplicarHeadersCors(req, res, this.allowedOrigins);
    } catch (e) {
      // Se até o header falhou, ainda tenta responder algo.
      Logger.error(`[CORS-Filter] Falha ao aplicar CORS: ${e}`, 'CORS');
    }

    if (!res.headersSent) {
      res.status(status).json(body);
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // ============================================================
  // CONFIGURAÇÃO DE ORIGENS PERMITIDAS
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

  // ============================================================
  // 1) FILTRO GLOBAL DE EXCEÇÕES (deve vir ANTES dos pipes).
  //    Garante CORS em respostas de erro vindas do NestJS.
  // ============================================================
  app.useGlobalFilters(new CorsAwareExceptionFilter(allowedOrigins));

  // ============================================================
  // 2) CATCH-ALL DE OPTIONS — preflight em qualquer rota.
  //    Vercel/Render podem disparar OPTIONS em rotas não registradas.
  //    Responder 204 com CORS é melhor do que 404 sem CORS.
  // ============================================================
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.options('*', (req: Request, res: Response) => {
    try {
      aplicarHeadersCors(req, res, allowedOrigins);
    } finally {
      res.status(204).end();
    }
  });

  // ============================================================
  // 3) MIDDLEWARE EXPRESS MANUAL — cobre todas as rotas e
  //    também adiciona CORS em respostas de sucesso.
  // ============================================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      aplicarHeadersCors(req, res, allowedOrigins);
    } catch (e) {
      Logger.error(`[CORS-MW] Falha ao aplicar CORS: ${e}`, 'CORS');
    }
    next();
  });

  // ============================================================
  // 4) PIPES GLOBAIS (validation).
  //    Erros do ValidationPipe serão capturados pelo
  //    CorsAwareExceptionFilter e sairão com CORS.
  // ============================================================
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ============================================================
  // 5) CATCH-ALL DE 404 — qualquer rota desconhecida volta
  //    com CORS aplicado, evitando que o navegador exiba a
  //    mensagem "No 'Access-Control-Allow-Origin' header".
  // ============================================================
  app.use((req: Request, res: Response) => {
    try {
      aplicarHeadersCors(req, res, allowedOrigins);
    } finally {
      if (!res.headersSent) {
        res.status(404).json({
          statusCode: 404,
          message: `Rota ${req.method} ${req.path} não encontrada.`,
          error: 'Not Found',
        });
      }
    }
  });

  // Timeout generoso para o Gemini (free tier pode demorar)
  const server = app.getHttpServer();
  server.setTimeout(120_000);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');

  Logger.log(`[Backend] Rodando na porta ${port}`, 'Bootstrap');
  Logger.log(`[Backend] CORS liberado para:`, 'Bootstrap');
  allowedOrigins.forEach((o) => Logger.log(`  - ${o}`, 'Bootstrap'));
  Logger.log(`[Backend] + qualquer localhost/127.0.0.`, 'Bootstrap');
}
bootstrap();