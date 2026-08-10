import { Injectable, InternalServerErrorException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');

// eslint-disable-next-line @typescript-eslint/no-var-requires
type PDFDoc = any;

interface DadosPessoais {
  nome?: string;
  cidade?: string;
  telefone?: string;
  email?: string;
  linkedin?: string;
  github?: string;
}

interface ExperienciaItem {
  cargo?: string;
  empresa?: string;
  periodo?: string;
  descricao?: string;
  bullets?: string[];
}

interface FormacaoItem {
  curso?: string;
  instituicao?: string;
  periodo?: string;
  status?: string;
}

interface IdiomaItem {
  idioma?: string;
  nome?: string;
  nivel?: string;
}

interface Curriculo {
  dados_pessoais?: DadosPessoais;
  resumo_profissional?: string;
  resumoProfissional?: string;
  resumo?: string;
  experiencias?: ExperienciaItem[];
  formacao?: FormacaoItem[];
  habilidades?: string[];
  idiomas?: (IdiomaItem | string)[];
}

@Injectable()
export class PdfService {
  private readonly COR_PRIMARIA = '#1E3A8A';
  private readonly COR_SECUNDARIA = '#2563EB';
  private readonly COR_TEXTO = '#1F2937';
  private readonly COR_SUAVES = '#6B7280';
  private readonly COR_LINHA = '#E5E7EB';

  async gerarPdf(html: string): Promise<Buffer> {
    try {
      const curriculo = this.extrairDadosDoHtml(html);

      return await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: `Currículo — ${curriculo.dados_pessoais?.nome || 'Profissional'}`,
            Author: 'CIJA',
            Subject: 'Currículo gerado',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        this.desenharCurriculo(doc, curriculo);

        doc.end();
      });
    } catch (error) {
      console.error('Erro no PdfService:', error);
      throw new InternalServerErrorException('Falha ao gerar o arquivo PDF.');
    }
  }

  /**
   * Extrai os campos do currículo a partir do HTML enviado pelo frontend.
   * Procura tanto nos elementos de classe CSS quanto em comentários JSON.
   * Se nenhum bloco estruturado for encontrado, faz fallback no texto puro.
   */
  private extrairDadosDoHtml(html: string): Curriculo {
    const jsonMatch = html.match(/<!--CURRICULO_JSON:([\s\S]*?)-->/);
    if (jsonMatch) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed: Curriculo = JSON.parse(jsonMatch[1].trim());
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // cai no fallback abaixo
      }
    }
    return this.extrairDoHtmlLegado(html);
  }

  private extrairDoHtmlLegado(html: string): Curriculo {
    const texto = this.htmlParaTexto(html);
    const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    const nome = linhas[0] && linhas[0].length < 80 ? linhas[0] : 'Profissional';
    return {
      dados_pessoais: { nome },
      resumo_profissional: texto.slice(nome.length).trim(),
      experiencias: [],
      formacao: [],
      habilidades: [],
      idiomas: [],
    };
  }

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

  private desenharCurriculo(doc: PDFDoc, c: Curriculo): void {
    const dp = c.dados_pessoais || {};
    const nome = (dp.nome || 'Profissional').toString().toUpperCase().trim();

    // ====================== CABEÇALHO ======================
    doc.fillColor(this.COR_PRIMARIA)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(nome, { align: 'center' });

    doc.moveDown(0.3);
    const yDepoisDoNome = doc.y;
    doc
      .strokeColor(this.COR_PRIMARIA)
      .lineWidth(1.5)
      .moveTo(50, yDepoisDoNome)
      .lineTo(doc.page.width - 50, yDepoisDoNome)
      .stroke();
    doc.moveDown(0.5);

    const camposContato = [dp.cidade, dp.telefone, dp.email, dp.linkedin, dp.github]
      .map((v) => (v ? String(v).trim() : ''))
      .filter(Boolean);

    if (camposContato.length > 0) {
      const linhaContato = camposContato.join('   |   ');
      doc
        .fillColor(this.COR_TEXTO)
        .font('Helvetica')
        .fontSize(9.5)
        .text(linhaContato, { align: 'center' });
      doc.moveDown(0.8);
    }

    // ====================== RESUMO ======================
    const resumo =
      c.resumo_profissional || c.resumoProfissional || c.resumo || '';

    if (resumo.trim().length > 0) {
      this.desenharCabecalhoSecao(doc, 'RESUMO PROFISSIONAL');
      doc
        .fillColor(this.COR_TEXTO)
        .font('Helvetica')
        .fontSize(10.5)
        .text(resumo.trim(), { align: 'justify', lineGap: 2 });
      doc.moveDown(0.8);
    }

    // ====================== EXPERIÊNCIA ======================
    const experiencias = Array.isArray(c.experiencias) ? c.experiencias : [];
    if (experiencias.length > 0) {
      this.desenharCabecalhoSecao(doc, 'EXPERIÊNCIA PROFISSIONAL');
      experiencias.forEach((exp) => {
        const cargo = (exp.cargo || '').toString().trim();
        const empresa = (exp.empresa || '').toString().trim();
        const periodo = (exp.periodo || '').toString().trim();
        const bullets = this.obterBullets(exp);

        if (cargo) {
          doc
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .fontSize(11.5)
            .text(cargo, { continued: false });
        }

        if (empresa) {
          doc
            .fillColor(this.COR_SECUNDARIA)
            .font('Helvetica-Bold')
            .fontSize(10.5)
            .text(empresa, { continued: !!periodo });
        }
        if (periodo) {
          doc
            .fillColor(this.COR_SUAVES)
            .font('Helvetica-Oblique')
            .fontSize(9.5)
            .text(periodo, { align: 'right' });
        }
        if (empresa || periodo) doc.moveDown(0.2);

        bullets.forEach((b) => {
          doc
            .fillColor(this.COR_TEXTO)
            .font('Helvetica')
            .fontSize(10)
            .text(`• ${b}`, { indent: 12, lineGap: 1.5 });
        });
        doc.moveDown(0.6);
      });
    }

    // ====================== FORMAÇÃO ======================
    const formacao = Array.isArray(c.formacao) ? c.formacao : [];
    if (formacao.length > 0) {
      this.desenharCabecalhoSecao(doc, 'FORMAÇÃO ACADÊMICA');
      formacao.forEach((f) => {
        const curso = (f.curso || '').toString().trim();
        const instituicao = (f.instituicao || '').toString().trim();
        const periodo = (f.periodo || '').toString().trim();
        const status = (f.status || '').toString().trim();

        if (curso) {
          doc
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(curso + (status ? ` (${status})` : ''), { continued: !!periodo });
        }
        if (periodo) {
          doc
            .fillColor(this.COR_SUAVES)
            .font('Helvetica-Oblique')
            .fontSize(9.5)
            .text(periodo, { align: 'right' });
        }
        if (curso || periodo) doc.moveDown(0.2);

        if (instituicao) {
          doc
            .fillColor('#4B5563')
            .font('Helvetica')
            .fontSize(10)
            .text(instituicao);
        }
        doc.moveDown(0.5);
      });
    }

    // ====================== HABILIDADES ======================
    const habilidades = Array.isArray(c.habilidades)
      ? c.habilidades.map((h) => String(h || '').trim()).filter(Boolean)
      : [];

    if (habilidades.length > 0) {
      this.desenharCabecalhoSecao(doc, 'HABILIDADES E COMPETÊNCIAS');
      const porLinha = 4;
      for (let i = 0; i < habilidades.length; i += porLinha) {
        const bloco = habilidades.slice(i, i + porLinha);
        doc
          .fillColor(this.COR_TEXTO)
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text(bloco.join('    •    '), { lineGap: 4 });
      }
      doc.moveDown(0.8);
    }

    // ====================== IDIOMAS ======================
    const idiomasRaw = Array.isArray(c.idiomas) ? c.idiomas : [];
    if (idiomasRaw.length > 0) {
      this.desenharCabecalhoSecao(doc, 'IDIOMAS');
      idiomasRaw.forEach((i) => {
        if (typeof i === 'string') {
          doc
            .fillColor(this.COR_TEXTO)
            .font('Helvetica-Bold')
            .fontSize(10.5)
            .text(`• ${i}`);
        } else {
          const nome = (i.idioma || i.nome || '').toString().trim();
          const nivel = (i.nivel || '').toString().trim();
          if (nome) {
            doc
              .fillColor(this.COR_TEXTO)
              .font('Helvetica-Bold')
              .fontSize(10.5)
              .text(`• ${nome}${nivel ? ` — ${nivel}` : ''}`);
          }
        }
      });
    }

    doc.fillColor(this.COR_TEXTO);
  }

  private desenharCabecalhoSecao(doc: PDFDoc, titulo: string): void {
    this.garantirEspaco(doc, 60);

    doc.moveDown(0.6);
    doc
      .fillColor(this.COR_PRIMARIA)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(titulo.toUpperCase());

    const yLinha = doc.y + 2;
    doc
      .strokeColor(this.COR_LINHA)
      .lineWidth(0.7)
      .moveTo(50, yLinha)
      .lineTo(doc.page.width - 50, yLinha)
      .stroke();

    doc.moveDown(0.5);
  }

  private garantirEspaco(doc: PDFDoc, altura: number): void {
    const margemInferior = doc.page.height - 50;
    if (doc.y + altura > margemInferior) {
      doc.addPage();
    }
  }

  private obterBullets(exp: ExperienciaItem): string[] {
    if (Array.isArray(exp.bullets) && exp.bullets.length > 0) {
      return exp.bullets.map((b) => String(b || '').trim()).filter(Boolean);
    }
    if (Array.isArray((exp as any).descricao)) {
      return ((exp as any).descricao as any[])
        .map((b) => String(b || '').trim())
        .filter(Boolean);
    }
    const desc = (exp.descricao || '').toString();
    if (desc.trim().length > 0) {
      return desc
        .split('\n')
        .map((b) => b.replace(/^[•\-*]\s*/, '').trim())
        .filter(Boolean);
    }
    return [];
  }
}
