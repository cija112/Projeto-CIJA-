import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Configuração correta de CORS para aceitar conexões do seu Front e local
  app.enableCors({
    origin: '*', // Se você usa cookies/auth, substitua '*' pela URL do seu frontend (ex: 'https://seu-front.onrender.com')
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT || 3001);

  //  garantir que o servidor aceite conexões externas no Render
  await app.listen(port, '0.0.0.0');

  console.log(`Servidor rodando na porta ${port}`);
}
bootstrap();
