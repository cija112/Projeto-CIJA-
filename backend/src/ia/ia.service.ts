/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { gerarCurriculoPrompt } from './prompts/curriculo.prompt';

// pdf-parse será carregado LAZY (dentro da função) para não inflar
// a memória na inicialização do NestJS. Importar no top-level puxa
// pdfjs-dist e estoura o limite de 512MB do Render free tier.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
let pdfParse: any = null;
// eslint-disable-next-line @typescript-eslint/require-await
const carregarPdfParse = async () => {
  if (!pdfParse) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    pdfParse = require('pdf-parse');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return pdfParse;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// Modelos válidos da API Gemini (atualizado 2026)
const MODELOS_VALIDOS = ['gemini-3.5-flash'];

@Injectable()
export class IaService {
  private ai: GoogleGenAI;
  private modelName: string;
  private _supabase: SupabaseClient | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        '[IaService] Aviso: GEMINI_API_KEY não está configurada no .env',
      );
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });

    // Fallback seguro se a env var tiver modelo inválido
    const modeloEnv = process.env.GEMINI_MODEL;
    this.modelName =
      modeloEnv && MODELOS_VALIDOS.includes(modeloEnv)
        ? modeloEnv
        : 'gemini-3.5-flash';

    if (modeloEnv && !MODELOS_VALIDOS.includes(modeloEnv)) {
      console.warn(
        `[IaService] GEMINI_MODEL="${modeloEnv}" não é válido. Usando fallback: ${this.modelName}`,
      );
    }
  }

  // Método getter seguro para instanciar o Supabase apenas quando necessário
  private getSupabase(): SupabaseClient {
    if (this._supabase) return this._supabase;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new ServiceUnavailableException(
        'As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão configuradas no .env do backend.',
      );
    }

    this._supabase = createClient(supabaseUrl, supabaseKey);
    return this._supabase;
  }

  async revisar(file: Express.Multer.File, vaga: string, userId: string) {
    if (!file) {
      throw new BadRequestException('Nenhum currículo foi enviado.');
    }
    if (!vaga || !vaga.trim()) {
      throw new BadRequestException('A vaga é obrigatória.');
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestException('Usuário não identificado.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('Arquivo excede o limite de 10 MB.');
    }

    const supabase = this.getSupabase();

    // ==========================================================
    // VALIDAÇÃO DE LIMITE DIÁRIO (1 revisão por dia)
    // ==========================================================
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const { data: revisoesHoje, error: erroBusca } = await supabase
      .from('historico_revisoes')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', inicioHoje.toISOString());

    if (erroBusca) {
      console.error('Erro ao verificar limite diário:', erroBusca.message);
      throw new ServiceUnavailableException(
        'Erro ao validar limite diário no banco de dados.',
      );
    }

    if (revisoesHoje && revisoesHoje.length > 0) {
      throw new HttpException(
        {
          limiteExcedido: true,
          mensagem:
            'Você já atingiu o limite de 1 revisão de currículo por dia. Tente novamente amanhã.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const textoCurriculo = await this.extrairTexto(file);
    if (!textoCurriculo || textoCurriculo.trim().length < 20) {
      throw new BadRequestException(
        'Não foi possível extrair texto legível do arquivo. Verifique se o PDF não é uma imagem digitalizada.',
      );
    }

    // ==========================================================
    // ETAPA 1: Gerar o Currículo Otimizado e Estruturado
    // ==========================================================
    const promptCurriculo = gerarCurriculoPrompt(textoCurriculo, vaga);
    const inicio1 = Date.now();
    const dadosCurriculoRaw = await this.chamarGemini(promptCurriculo);
    const tempo1 = Date.now() - inicio1;

    const textoLimpoCurriculo = dadosCurriculoRaw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const respostaCurriculo = this.tentarParsearJson(textoLimpoCurriculo);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const curriculoEstruturado =
      respostaCurriculo.curriculoEstruturado ||
      respostaCurriculo.curriculo_estruturado ||
      respostaCurriculo.curriculo ||
      null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const curriculoRevisadoText =
      respostaCurriculo.curriculo_revisado ||
      respostaCurriculo.curriculoRevisado ||
      respostaCurriculo.curriculoOtimizadoText ||
      '';

    // ==========================================================
    // ETAPA 2: Gerar Análise e Compatibilidade
    // ==========================================================
    let dadosAnalise: any = {
      compatibilidade_antes: null,
      compatibilidade_depois: null,
      nota_final: null,
      vaga_detectada: '',
      melhorias_realizadas: [],
    };

    try {
      const promptAnalise = `Analise o currículo a seguir frente à vaga informada e retorne APENAS um JSON válido contendo:
- compatibilidade_antes (número de 0 a 100, porcentagem real de aderência do currículo ORIGINAL)
- compatibilidade_depois (número de 0 a 100, porcentagem real de aderência do currículo REVISADO, considerando APENAS as competências reais já presentes no candidato — não invente habilidades novas para inflar)
- nota_final (número de 0.0 a 10.0 com uma casa decimal, baseada no conteúdo real; currículos vazios devem receber notas baixas como 2.5 a 4.5, NUNCA padronize em 7.0 ou 8.5)
- vaga_detectada (string com o título identificado)
- melhorias_realizadas (array de strings, no máximo 4 itens curtos)

REGRA CRÍTICA: não infle notas nem compatibilidade. Se o currículo for genérico e pouco aderente à vaga, retorne valores baixos de verdade. Não force notas acima de 7.0 sem justificativa real.

VAGA: ${vaga}
CURRICULO: ${JSON.stringify(curriculoEstruturado)}`;

      const dadosAnaliseRaw = await this.chamarGemini(promptAnalise);
      const textoLimpoAnalise = dadosAnaliseRaw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dadosAnalise = this.tentarParsearJson(textoLimpoAnalise);
    } catch (erroAnalise) {
      console.warn(
        'Aviso: A segunda IA de análise falhou, mas o currículo foi gerado com sucesso.',
        erroAnalise,
      );
    }

    // ==========================================================
    // REGISTRO DE SUCESSO: Salvar histórico de revisão no Supabase
    // ==========================================================
    const { error: erroInsercao } = await supabase
      .from('historico_revisoes')
      .insert([{ user_id: userId }]);

    if (erroInsercao) {
      console.error(
        'Erro ao salvar histórico de revisão no Supabase:',
        erroInsercao.message,
      );
    }

    return {
      modelo: this.modelName,
      tempo_ms: tempo1,
      tokens: 0,
      vaga: vaga,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      curriculoEstruturado,
      // eslint-disable-content...
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      curriculoOtimizadoText: curriculoRevisadoText,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      curriculo_revisado: curriculoRevisadoText,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      compatibilidade_antes:
        dadosAnalise.compatibilidade_antes ??
        dadosAnalise.compatibilidadeAntes ??
        null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      compatibilidade_depois:
        dadosAnalise.compatibilidade_depois ??
        dadosAnalise.compatibilidadeDepois ??
        null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      nota_final: dadosAnalise.nota_final ?? dadosAnalise.nota ?? null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      vaga_detectada: dadosAnalise.vaga_detectada ?? '',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      melhorias_realizadas: dadosAnalise.melhorias_realizadas ?? [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      resposta: {
        ...respostaCurriculo,
        ...dadosAnalise,
      },
    };
  }

  // ------------------------------------------------------------
  // Extração de texto PDF / DOCX
  // ------------------------------------------------------------
  private async extrairTexto(file: Express.Multer.File): Promise<string> {
    const extensao = file.originalname.split('.').pop()?.toLowerCase();
    const ehPdf = file.mimetype === 'application/pdf' || extensao === 'pdf';
    const ehDocx =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extensao === 'docx';

    if (ehPdf) {
      try {
        // Carrega pdf-parse lazy (evita pdfjs-dist no boot do NestJS)
        const parser = await carregarPdfParse();
        const parseFunction = parser.default || parser;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const pdfData = await parseFunction(file.buffer);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return (pdfData.text || '').toString();
      } catch (err: any) {
        throw new BadRequestException(
          `Erro ao ler o arquivo PDF: ${err?.message || 'arquivo inválido'}`,
        );
      }
    }

    if (ehDocx) {
      try {
        const doc = await mammoth.extractRawText({ buffer: file.buffer });
        return (doc.value || '').toString();
      } catch (err: any) {
        throw new BadRequestException(
          `Erro ao ler o arquivo DOCX: ${err?.message || 'arquivo inválido'}`,
        );
      }
    }

    throw new BadRequestException(
      'Formato inválido. Envie um arquivo PDF ou DOCX.',
    );
  }

  // ------------------------------------------------------------
  // Chamada ao Google Gemini
  // ------------------------------------------------------------
  private async chamarGemini(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      if (!response.text) {
        throw new ServiceUnavailableException(
          'O Cija retornou uma resposta vazia.',
        );
      }

      return response.text;
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Falha ao comunicar com o Cija IA: ${err?.message || 'erro desconhecido'}`,
      );
    }
  }

  // ------------------------------------------------------------
  // Parse seguro do JSON retornado pela IA
  // ------------------------------------------------------------
  private tentarParsearJson(textoLimpo: string): any {
    const inicio = textoLimpo.indexOf('{');
    if (inicio === -1) {
      throw new ServiceUnavailableException(
        'A IA não retornou um JSON estruturado. Tente novamente.',
      );
    }

    const fim = this.encontrarFimJson(textoLimpo, inicio);
    if (fim === -1) {
      throw new ServiceUnavailableException(
        'A IA retornou um JSON incompleto. Tente novamente.',
      );
    }

    const jsonString = textoLimpo.substring(inicio, fim + 1);

    try {
      return JSON.parse(jsonString);
    } catch {
      const recuperado = jsonString
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/\n/g, '\\n');
      try {
        return JSON.parse(recuperado);
      } catch {
        throw new ServiceUnavailableException(
          'A IA retornou um JSON malformado. Tente novamente.',
        );
      }
    }
  }

  private encontrarFimJson(texto: string, inicio: number): number {
    let profundidade = 0;
    let emString = false;
    let escape = false;
    for (let i = inicio; i < texto.length; i++) {
      const c = texto[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        emString = !emString;
        continue;
      }
      if (emString) continue;
      if (c === '{') profundidade++;
      else if (c === '}') {
        profundidade--;
        if (profundidade === 0) return i;
      }
    }
    return -1;
  }
}
