import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IaModule } from './ia/ia.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [IaModule, PdfModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
