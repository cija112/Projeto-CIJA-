import { Injectable, InternalServerErrorException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');

// eslint-disable-next-line @typescript-eslint/no-var-requires
type PDFDoc = any;

@Injectable()
export class PdfService {
  async gerarPdf(html: string): Promise<Buffer> {
    try {
      // Extrai o texto limpo do HTML enviado pelo frontend
      const texto = this.htmlParaTexto(html);

      return await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: 'Currículo',
            Author: 'CIJA',
            Subject: 'Currículo gerado',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        this.desenharTexto(doc, texto);

        doc.end();
      });
    } catch (error) {
      console.error('Erro no PdfService:', error);
      throw new InternalServerErrorException('Falha ao gerar o arquivo PDF.');
    }
  }

  /**
   * Converte HTML básico em texto preservando quebras de linha de
   * <h1>, <h2>, <h3>, <p>, <li>, <br>, <div>.
   */
  private htmlParaTexto(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private desenharTexto(doc: PDFDoc, texto: string): void {
    const linhas = texto.split('\n');

    for (const linha of linhas) {
      const trimmed = linha.trim();

      if (trimmed.length === 0) {
        doc.moveDown(0.5);
        continue;
      }

      if (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && /[A-ZÁÉÍÓÚÃÕÂÊÔÇ]/.test(trimmed)) {
        doc.fontSize(14).font('Helvetica-Bold').text(trimmed);
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica');
      } else {
        doc.fontSize(11).font('Helvetica').text(trimmed, {
          align: 'left',
          lineGap: 2,
        });
      }
      doc.moveDown(0.2);
    }
  }
}
