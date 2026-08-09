import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Health check simples para o Render manter o serviço vivo
  @Get()
  getStatus(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // Health check específico usado pelo Render
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
