import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  TabStopType,
} from "docx";
// @ts-ignore - html2pdf.js não tem tipos oficiais
import html2pdf from "html2pdf.js";
import { fetchSeguro } from "./apiHelpers";
import API_BASE_URL from "../config/api";

/* ============================================================
   DICIONÁRIO LÉXICO PARA O SCORE REAL
   ============================================================ */

const STOPWORDS = new Set<string>([
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "uns",
  "umas",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "ou",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "por",
  "para",
  "com",
  "sem",
  "sob",
  "sobre",
  "entre",
  "que",
  "se",
  "ja",
  "já",
  "foi",
  "ser",
  "tem",
  "ter",
  "sido",
  "sao",
  "são",
  "ter",
  "tido",
  "eu",
  "voce",
  "você",
  "tu",
  "ele",
  "ela",
  "nos",
  "nós",
  "eles",
  "elas",
  "meu",
  "minha",
  "seu",
  "sua",
  "nosso",
  "nossa",
  "este",
  "esta",
  "isto",
  "aquilo",
  "isso",
  "esse",
  "essa",
  "muito",
  "muita",
  "pouco",
  "pouca",
  "mais",
  "menos",
  "tambem",
  "também",
  "apenas",
  "ate",
  "até",
  "desde",
  "como",
  "quando",
  "onde",
  "aqui",
  "ali",
  "la",
  "lá",
  "cá",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "for",
  "on",
  "at",
  "by",
  "an",
  "a",
  "i",
  "is",
  "it",
  "be",
  "as",
  "if",
  "so",
  "we",
  "he",
  "she",
  "they",
  "you",
  "this",
  "that",
  "with",
  "from",
  "vaga",
  "oportunidade",
  "cargo",
  "empresa",
  "profissional",
  "perfil",
  "candidato",
  "atuar",
  "atuando",
  "atuação",
  "atuei",
  "trabalhei",
  "trabalho",
  "experiencia",
  "experiência",
  "anos",
  "ano",
  "meses",
  "mes",
  "local",
  "atuais",
  "anterior",
  "etc",
  "ex",
  "i",
  "ii",
  "iii",
  "iv",
]);

/**
 * Tokeniza um texto, removendo pontuação, acentos, stopwords e palavras curtas.
 */
function tokenizar(texto: string): string[] {
  if (!texto || typeof texto !== "string") return [];
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s\-+#./]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * Retorna a frequência de cada token significativo.
 */
function frequencia(tokens: string[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const t of tokens) {
    mapa.set(t, (mapa.get(t) || 0) + 1);
  }
  return mapa;
}

/**
 * Detecta bigrams (pares de palavras) para análise contextual.
 */
function gerarBigramas(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (a.length >= 3 && b.length >= 3) bigrams.push(`${a} ${b}`);
  }
  return bigrams;
}

/* ============================================================
   2) MOTOR DE SCORE (NOTA + COMPATIBILIDADE)
   ------------------------------------------------------------
   Critérios avaliados (0 a 10 cada):
   1. Estrutura textual    (presença de seções obrigatórias)
   2. Clareza executiva    (uso de verbos de ação, métricas, %)
   3. Alinhamento à vaga   (overlap TF-IDF + bigrams com a descrição)
   4. Palavras-chave ATS   (termos técnicos compatíveis com a vaga)

   A nota final é a média ponderada:
     - 15% estrutura
     - 15% clareza
     - 45% alinhamento à vaga  (fator mais relevante)
     - 25% palavras-chave ATS

   A compatibilidade com a vaga é dada por:
     - 60% alinhamento de tokens e bigrams
     - 30% cobertura de termos técnicos
     - 10% bônus por estrutura/clareza
   ============================================================ */

export interface AnaliseScore {
  nota: number; // 0 a 10
  compatibilidade: number; // 0 a 100 (%)
  criterios: {
    estruturaTextual: number;
    clarezaExecutiva: number;
    alinhamentoVaga: number;
    palavrasChaveAts: number;
  };
  palavrasChaveEncontradas: string[];
  palavrasChaveFaltantes: string[];
  melhorias: string[];
  pontosFortes: string[];
  detalhes: {
    tokensVaga: number;
    tokensCurrículo: number;
    tokensMatch: number;
    bigramsVaga: number;
    bigramsCurrículo: number;
    bigramsMatch: number;
    termosTecnicosVaga: number;
    termosTecnicosMatch: number;
    totalExperiencias: number;
    totalHabilidades: number;
    totalFormacao: number;
    tamanhoResumoCaracteres: number;
  };
}

const VERBOS_ACAO = new Set([
  "desenvolvi",
  "desenvolveu",
  "desenvolver",
  "criei",
  "criou",
  "criar",
  "implementei",
  "implementou",
  "implementar",
  "liderei",
  "liderou",
  "liderar",
  "gerenciei",
  "gerenciou",
  "gerenciar",
  "coordenei",
  "coordenou",
  "coordenar",
  "otimizei",
  "otimizou",
  "otimizar",
  "automatizei",
  "automatizou",
  "automatizar",
  "reduzi",
  "reduziu",
  "reduzir",
  "aumentei",
  "aumentou",
  "aumentar",
  "projetei",
  "projetou",
  "projetar",
  "planejei",
  "planejou",
  "planejar",
  "executei",
  "executou",
  "executar",
  "realizei",
  "realizou",
  "realizar",
  "conquistei",
  "conquistou",
  "conquistar",
  "ministrei",
  "ministrou",
  "ministrar",
  "treinei",
  "treinou",
  "treinar",
  "construi",
  "construiu",
  "construir",
  "mantive",
  "manteve",
  "manter",
  "elaborei",
  "elaborou",
  "elaborar",
  "analisei",
  "analisou",
  "analisar",
  "aplicou",
  "aplicar",
  "contribui",
  "contribuiu",
  "contribuir",
  "apoiei",
  "apoiou",
  "responsabilizei",
  "responsabilizou",
  "responsabilizar",
  "atuei",
  "atuou",
  "atuar",
  "trabalhei",
  "trabalhou",
  "trabalhar",
  "promovi",
  "promoveu",
  "promover",
  "alcancei",
  "alcancou",
  "alcancar",
  "superou",
  "superar",
  "estabeleceu",
  "estabeleci",
  "estabelecer",
  "mapeei",
  "mapeou",
  "mapear",
  "catalisei",
  "catalisou",
  "catalisar",
  "reestruturei",
  "reestruturou",
  "reestruturar",
]);

const TERMOS_TECNICOS_COMUNS = new Set([
  "javascript",
  "typescript",
  "react",
  "node",
  "nodejs",
  "python",
  "java",
  "sql",
  "mysql",
  "postgres",
  "postgresql",
  "mongodb",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "git",
  "github",
  "gitlab",
  "bitbucket",
  "html",
  "css",
  "sass",
  "less",
  "tailwind",
  "figma",
  "photoshop",
  "illustrator",
  "canva",
  "excel",
  "word",
  "powerpoint",
  "office",
  "libre",
  "sap",
  "salesforce",
  "jira",
  "trello",
  "asana",
  "notion",
  "scrum",
  "agile",
  "kanban",
  "lean",
  "seo",
  "sem",
  "google",
  "analytics",
  "adsense",
  "ads",
  "meta",
  "tiktok",
  "linkedin",
  "api",
  "rest",
  "graphql",
  "microsservicos",
  "microsserviços",
  "frontend",
  "backend",
  "fullstack",
  "devops",
  "qa",
  "testes",
  "jest",
  "cypress",
  "selenium",
  "linux",
  "windows",
  "macos",
  "android",
  "ios",
  "swift",
  "kotlin",
  "flutter",
  "dart",
  "vue",
  "angular",
  "nextjs",
  "nestjs",
  "express",
  "django",
  "flask",
  "spring",
  "hibernate",
  "redis",
  "rabbitmq",
  "kafka",
  "terraform",
  "ansible",
  "jenkins",
  "ci",
  "cd",
  "pipeline",
  "machine",
  "learning",
  "ia",
  "ai",
  "nlp",
  "data",
  "powerbi",
  "tableau",
  "etl",
  "elt",
  "dax",
  "r",
  "scala",
  "spark",
  "hadoop",
  "vba",
  "macros",
  "atendimento",
  "cliente",
  "vendas",
  "negociacao",
  "negociação",
  "crm",
  "erp",
  "rh",
  "recrutamento",
  "selecao",
  "seleção",
  "treinamento",
  "onboarding",
  "folha",
  "ponto",
  "esocial",
  "contabilidade",
  "fiscal",
  "financeiro",
  "cobranca",
  "cobrança",
  "credito",
  "crédito",
  "conta",
  "pagamento",
  "banco",
  "tesouraria",
  "compras",
  "logistica",
  "logística",
  "estoque",
  "inventario",
  "inventário",
  "marketing",
  "conteudo",
  "conteúdo",
  "design",
  "ux",
  "ui",
  "produto",
  "okr",
  "kpi",
  "pmo",
  "compliance",
  "auditoria",
  "controladoria",
  "reactjs",
  "angularjs",
  "googleads",
  "facebookads",
  "tagmanager",
  "looker",
  "metabase",
  "airflow",
  "databricks",
  "snowflake",
  "redshift",
  "bigquery",
  "lambda",
  "s3",
  "ec2",
  "route53",
  "cloudfront",
  "iam",
  "vpc",
  "ecs",
  "eks",
  "fargate",
  "premiere",
  "aftereffects",
  "lightroom",
  "blender",
  "maya",
  "3dsmax",
  "unity",
  "unrealengine",
  "c++",
  "c#",
  "golang",
  "rust",
  "ruby",
  "rails",
  "laravel",
  "symfony",
  "codeigniter",
  "wordpress",
  "magento",
  "shopify",
  "woocommerce",
  "prestashop",
  "hubspot",
  "zendesk",
  "intercom",
  "freshdesk",
  "pipedrive",
  "rdstation",
  "mailchimp",
  "sendgrid",
  "twilio",
  "stripe",
  "paypal",
  "mercadopago",
  "pagseguro",
  "reactnative",
  "expo",
  "ionic",
  "cordova",
  "phonegap",
  "xamarin",
  "nativescript",
]);

/**
 * Extrai o texto corrido de qualquer objeto de currículo,
 * percorrendo recursivamente campos string.
 */
function achatarTexto(obj: any, acumulado: string[] = []): string[] {
  if (obj === null || obj === undefined) return acumulado;
  if (typeof obj === "string") {
    if (obj.trim().length > 0) acumulado.push(obj);
    return acumulado;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) achatarTexto(item, acumulado);
    return acumulado;
  }
  if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      achatarTexto(obj[key], acumulado);
    }
  }
  return acumulado;
}

/**
 * Recupera a string-resumo do currículo em vários formatos.
 */
function obterResumo(dados: any): string {
  if (!dados || typeof dados !== "object") return "";
  const candidatos = [
    dados.resumo_profissional,
    dados.resumoProfissional,
    dados.resumo,
    dados.dados_pessoais?.resumo,
    dados.dadosPessoais?.resumo,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  return "";
}

/**
 * Calcula a nota analítica e a compatibilidade com a vaga,
 * com base no conteúdo real do currículo e na descrição da vaga.
 */
export function calcularScoreCurriculo(
  dadosCurriculo: any,
  vagaDescricao: string,
): AnaliseScore {
  const partesBrutas = achatarTexto(dadosCurriculo);
  const curriculoTextoBruto = partesBrutas.join(" ");
  const resumoStr = obterResumo(dadosCurriculo);

  const tokensCurriculo = tokenizar(curriculoTextoBruto);
  const setCurriculo = new Set(tokensCurriculo);
  const bigramsCurriculo = new Set(gerarBigramas(tokensCurriculo));

  const tokensVaga = tokenizar(vagaDescricao || "");
  const freqVaga = frequencia(tokensVaga);
  const bigramsVaga = gerarBigramas(tokensVaga);

  const temResumo = resumoStr.trim().length > 0;
  const temExperiencia =
    Array.isArray(dadosCurriculo?.experiencias) &&
    dadosCurriculo.experiencias.length > 0;
  const temFormacao =
    Array.isArray(dadosCurriculo?.formacao) &&
    dadosCurriculo.formacao.length > 0;
  const temHabilidades =
    Array.isArray(dadosCurriculo?.habilidades) &&
    dadosCurriculo.habilidades.length > 0;
  const temContato = !!(
    dadosCurriculo?.dados_pessoais?.email ||
    dadosCurriculo?.dadosPessoais?.email ||
    dadosCurriculo?.email
  );
  const temNome = !!(
    dadosCurriculo?.dados_pessoais?.nome ||
    dadosCurriculo?.dadosPessoais?.nome ||
    dadosCurriculo?.nome
  );

  let estrutura = 0;
  if (temNome) estrutura += 0.5;
  if (temContato) estrutura += 1.0;
  if (temResumo) estrutura += 2.5;
  if (temExperiencia) estrutura += 2.5;
  if (temFormacao) estrutura += 1.5;
  if (temHabilidades) estrutura += 1.5;
  if (temExperiencia && dadosCurriculo.experiencias.length >= 2)
    estrutura += 0.5;
  if (temExperiencia && dadosCurriculo.experiencias.length >= 3)
    estrutura += 0.3;
  if (temResumo && resumoStr.length >= 80 && resumoStr.length <= 800) {
    estrutura += 0.5;
  }
  estrutura = Math.min(10, estrutura);

  let clareza = 0;
  if (resumoStr.length >= 80 && resumoStr.length <= 800) clareza += 2.0;
  if (resumoStr.length > 30) clareza += 1.0;

  let qtdVerbos = 0;
  VERBOS_ACAO.forEach((v) => {
    if (setCurriculo.has(v)) qtdVerbos++;
  });
  if (qtdVerbos >= 12) clareza += 3.5;
  else if (qtdVerbos >= 8) clareza += 3.0;
  else if (qtdVerbos >= 5) clareza += 2.0;
  else if (qtdVerbos >= 3) clareza += 1.5;
  else if (qtdVerbos >= 1) clareza += 0.8;

  const temMetricas =
    /\d+\s*%/.test(curriculoTextoBruto) ||
    /R\$\s*\d+/.test(curriculoTextoBruto) ||
    /\d+\s*(usuarios|usu[áa]rios|clientes|projetos|equipe|pessoas|funcion[áa]rios|vendas|leads)/i.test(
      curriculoTextoBruto,
    );
  if (temMetricas) clareza += 2.0;

  if (
    Array.isArray(dadosCurriculo?.habilidades) &&
    dadosCurriculo.habilidades.length >= 8
  )
    clareza += 2.0;
  else if (
    Array.isArray(dadosCurriculo?.habilidades) &&
    dadosCurriculo.habilidades.length >= 5
  )
    clareza += 1.5;
  else if (
    Array.isArray(dadosCurriculo?.habilidades) &&
    dadosCurriculo.habilidades.length >= 3
  )
    clareza += 1.0;

  let totalBullets = 0;
  if (Array.isArray(dadosCurriculo?.experiencias)) {
    for (const exp of dadosCurriculo.experiencias) {
      if (Array.isArray(exp.bullets)) totalBullets += exp.bullets.length;
    }
  }
  if (totalBullets >= 8) clareza += 1.0;
  else if (totalBullets >= 4) clareza += 0.5;

  clareza = Math.min(10, clareza);

  const tokensVagaRelevantes: string[] = [];
  freqVaga.forEach((_, tok) => {
    if (tok.length >= 3) tokensVagaRelevantes.push(tok);
  });

  let hits = 0;
  const total = Math.max(1, tokensVagaRelevantes.length);
  const palavrasEncontradasSet = new Set<string>();
  const palavrasFaltantesSet = new Set<string>();

  for (const tok of tokensVagaRelevantes) {
    if (setCurriculo.has(tok)) {
      hits++;
      palavrasEncontradasSet.add(tok);
    } else {
      if (tok.length >= 4) palavrasFaltantesSet.add(tok);
    }
  }
  const alinhamentoTokens = (hits / total) * 10;

  let bigramHits = 0;
  for (const bg of bigramsVaga) {
    if (bigramsCurriculo.has(bg)) bigramHits++;
  }
  const bigramScore =
    bigramsVaga.length > 0 ? (bigramHits / bigramsVaga.length) * 10 : 0;

  const alinhamento = Math.min(10, alinhamentoTokens * 0.7 + bigramScore * 0.3);

  const termosVagaSet = new Set<string>();
  for (const tok of tokensVaga) {
    if (TERMOS_TECNICOS_COMUNS.has(tok) || tok.length >= 5) {
      termosVagaSet.add(tok);
    }
  }

  let hitsAts = 0;
  const totalAts = Math.max(1, termosVagaSet.size);
  termosVagaSet.forEach((t) => {
    if (setCurriculo.has(t)) hitsAts++;
  });

  const temAlgumTermoTecnico = tokensCurriculo.some((t) =>
    TERMOS_TECNICOS_COMUNS.has(t),
  );
  const baseATS = (hitsAts / totalAts) * 10;
  const ats = Math.min(
    10,
    temAlgumTermoTecnico ? baseATS : Math.min(3, baseATS),
  );

  const notaBruta =
    estrutura * 0.15 + clareza * 0.15 + alinhamento * 0.45 + ats * 0.25;

  const bonus =
    (temResumo ? 0.1 : 0) +
    (temExperiencia ? 0.1 : 0) +
    (temHabilidades ? 0.05 : 0) +
    (temMetricas ? 0.05 : 0);

  const nota = Math.min(10, Math.max(0, notaBruta + bonus));

  const compatibilidadeBase =
    alinhamentoTokens * 0.35 +
    bigramScore * 0.25 +
    ats * 0.3 +
    estrutura * 0.05 +
    clareza * 0.05;

  const compatibilidade = Math.round(
    Math.min(100, Math.max(0, compatibilidadeBase * 10)),
  );

  const melhorias: string[] = [];
  if (!temResumo)
    melhorias.push(
      "Adicione um resumo profissional de 3 a 5 linhas destacando seus principais diferenciais.",
    );
  if (resumoStr.length > 0 && resumoStr.length < 80)
    melhorias.push(
      "Expanda seu resumo profissional — textos entre 80 e 800 caracteres transmitem mais autoridade.",
    );
  if (!temMetricas)
    melhorias.push(
      "Inclua indicadores quantitativos (%, R$, volume de usuários, prazos) nas descrições de experiência.",
    );
  if (qtdVerbos < 4)
    melhorias.push(
      "Use verbos de ação fortes no início de cada bullet (liderei, implementei, otimizei, reduzi).",
    );
  if (alinhamento < 6)
    melhorias.push(
      "Reforce no currículo os termos e tecnologias presentes na descrição da vaga-alvo.",
    );
  if (ats < 5)
    melhorias.push(
      "Aumente a cobertura de palavras-chave técnicas exigidas por sistemas ATS (ex.: React, SQL, Python).",
    );
  if (
    Array.isArray(dadosCurriculo?.habilidades) &&
    dadosCurriculo.habilidades.length < 6
  )
    melhorias.push(
      "Amplie a lista de habilidades técnicas e comportamentais relevantes para a área.",
    );
  if (
    Array.isArray(dadosCurriculo?.experiencias) &&
    dadosCurriculo.experiencias.length < 2
  )
    melhorias.push(
      "Detalhe ao menos duas vivências (profissionais, projetos pessoais ou acadêmicos) com resultados claros.",
    );
  if (palavrasFaltantesSet.size > 0)
    melhorias.push(
      `Termos relevantes da vaga ainda ausentes: ${Array.from(
        palavrasFaltantesSet,
      )
        .slice(0, 5)
        .join(", ")}.`,
    );

  const pontosFortes: string[] = [];
  if (estrutura >= 8)
    pontosFortes.push(
      "Estrutura completa do currículo, com seções bem definidas e profissionais.",
    );
  if (clareza >= 7)
    pontosFortes.push(
      "Clareza executiva consistente, com uso adequado de verbos de ação e indicadores.",
    );
  if (alinhamento >= 7)
    pontosFortes.push(
      "Forte alinhamento com a vaga-alvo, com termos e competências compatíveis.",
    );
  if (ats >= 7)
    pontosFortes.push(
      "Boa cobertura de palavras-chave técnicas exigidas por sistemas ATS.",
    );
  if (qtdVerbos >= 4)
    pontosFortes.push(
      "Uso consistente de verbos de ação que demonstram protagonismo e resultado.",
    );
  if (temMetricas)
    pontosFortes.push(
      "Presença de indicadores quantitativos que aumentam a credibilidade das entregas.",
    );
  if (bigramHits >= 3)
    pontosFortes.push(
      "Combinações de termos alinhadas ao contexto da vaga, demonstrando coerência técnica.",
    );
  if (pontosFortes.length === 0)
    pontosFortes.push(
      "Currículo com informações básicas legíveis e passíveis de evolução.",
    );

  return {
    nota: Number(nota.toFixed(1)),
    compatibilidade,
    criterios: {
      estruturaTextual: Number(estrutura.toFixed(1)),
      clarezaExecutiva: Number(clareza.toFixed(1)),
      alinhamentoVaga: Number(alinhamento.toFixed(1)),
      palavrasChaveAts: Number(ats.toFixed(1)),
    },
    palavrasChaveEncontradas: Array.from(palavrasEncontradasSet).slice(0, 20),
    palavrasChaveFaltantes: Array.from(palavrasFaltantesSet).slice(0, 20),
    melhorias,
    pontosFortes,
    detalhes: {
      tokensVaga: tokensVaga.length,
      tokensCurrículo: tokensCurriculo.length,
      tokensMatch: hits,
      bigramsVaga: bigramsVaga.length,
      bigramsCurrículo: bigramsCurriculo.size,
      bigramsMatch: bigramHits,
      termosTecnicosVaga: termosVagaSet.size,
      termosTecnicosMatch: hitsAts,
      totalExperiencias: Array.isArray(dadosCurriculo?.experiencias)
        ? dadosCurriculo.experiencias.length
        : 0,
      totalHabilidades: Array.isArray(dadosCurriculo?.habilidades)
        ? dadosCurriculo.habilidades.length
        : 0,
      totalFormacao: Array.isArray(dadosCurriculo?.formacao)
        ? dadosCurriculo.formacao.length
        : 0,
      tamanhoResumoCaracteres: resumoStr.length,
    },
  };
}

/* ============================================================
   3) RENDERIZAÇÃO DO HTML
   ============================================================ */

function escapar(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderHtmlCurriculo(d: any): string {
  const nome = escapar(d?.nome || "Candidato");
  const cidade = escapar(d?.cidade || "");
  const telefone = escapar(d?.telefone || "");
  const email = escapar(d?.email || "");
  const linkedin = escapar(d?.linkedin || "");
  const github = escapar(d?.github || "");

  const contatos = [cidade, telefone, email, linkedin, github]
    .filter(Boolean)
    .join(" &bull; ");

  const experiencias = Array.isArray(d?.experiencias) ? d.experiencias : [];
  const formacao = Array.isArray(d?.formacao) ? d.formacao : [];
  const habilidades = Array.isArray(d?.habilidades) ? d.habilidades : [];
  const idiomas = Array.isArray(d?.idiomas) ? d.idiomas : [];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Currículo — ${nome}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, "Helvetica", "Arial", sans-serif;
    color: #1F2937;
    line-height: 1.5;
    font-size: 11.5pt;
    max-width: 100%;
  }
  .curriculo-container {
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    padding: 24px 28px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #1F2937;
  }
  .curriculo-header {
    border-bottom: 2px solid #2563EB;
    padding-bottom: 12px;
    margin-bottom: 18px;
    text-align: left;
  }
  .curriculo-header h1 {
    font-size: 22pt;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 6px 0;
    font-weight: 700;
    line-height: 1.15;
  }
  .curriculo-header p {
    font-size: 10.5pt;
    color: #4B5563;
    margin: 0;
    line-height: 1.5;
  }
  .curriculo-body .secao {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .curriculo-body h2 {
    font-size: 12pt;
    color: #2563EB;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 3px;
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
  }
  .curriculo-body h3 {
    font-size: 11pt;
    color: #111827;
    font-weight: 600;
    margin: 0 0 3px 0;
  }
  .curriculo-body p {
    font-size: 10.5pt;
    line-height: 1.5;
    color: #374151;
    margin: 0 0 6px 0;
    text-align: justify;
  }
  .curriculo-body ul {
    padding-left: 18px;
    margin: 4px 0 0 0;
    color: #374151;
    font-size: 10.5pt;
  }
  .curriculo-body li {
    margin-bottom: 2px;
    line-height: 1.5;
  }
  .curriculo-body .periodo {
    font-size: 9.5pt;
    color: #6B7280;
    font-style: italic;
    display: block;
    margin-bottom: 4px;
  }
  .item-experiencia,
  .item-formacao {
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .habilidades-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 8px;
    margin: 0;
    padding: 0;
  }
  .habilidade-chip {
    display: inline-block;
    background: #EFF6FF;
    color: #1E3A8A;
    border: 1px solid #DBEAFE;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 10pt;
    font-weight: 600;
    line-height: 1.3;
    white-space: normal;
  }
  .linha-cabecalho {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    width: 100%;
    margin-bottom: 2px;
  }
  .titulo-cargo {
    font-weight: 700;
    font-size: 11pt;
    color: #111827;
    flex: 1 1 auto;
  }
  .data-periodo {
    font-style: italic;
    color: #4B5563;
    font-size: 9.5pt;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .exp-empresa {
    color: #2563EB;
    font-weight: 600;
    font-size: 10.5pt;
    margin-bottom: 4px;
  }
  @media print {
    .curriculo-container { padding: 0; max-width: 100%; }
    .curriculo-body .secao,
    .item-experiencia,
    .item-formacao { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="curriculo-container">
    <div class="curriculo-header">
      <h1>${nome}</h1>
      ${contatos ? `<p>${contatos}</p>` : ""}
    </div>

    <div class="curriculo-body">
      ${d?.resumo ? `<section class="secao"><h2>Resumo Profissional</h2><p>${escapar(d.resumo)}</p></section>` : ""}

      ${
        experiencias.length > 0
          ? `<section class="secao"><h2>Experiência Profissional</h2>${experiencias
              .map((exp: any) => {
                const bullets =
                  Array.isArray(exp.bullets) && exp.bullets.length > 0
                    ? exp.bullets
                    : exp.descricao
                      ? String(exp.descricao)
                          .split("\n")
                          .map((b) => b.replace(/^[•\-*]\s*/, "").trim())
                          .filter(Boolean)
                      : [];
                return `
                  <div class="item-experiencia">
                    <div class="linha-cabecalho">
                      <span class="titulo-cargo">${escapar(exp.cargo || exp.titulo || "Cargo")}</span>
                      <span class="data-periodo">${escapar(exp.periodo || "Recente")}</span>
                    </div>
                    ${exp.empresa ? `<div class="exp-empresa">${escapar(exp.empresa)}</div>` : ""}
                    ${
                      bullets.length > 0
                        ? `<ul>${bullets.map((b: string) => `<li>${escapar(b)}</li>`).join("")}</ul>`
                        : ""
                    }
                  </div>`;
              })
              .join("")}</section>`
          : ""
      }

      ${
        formacao.length > 0
          ? `<section class="secao"><h2>Formação Acadêmica</h2>${formacao
              .map(
                (f: any) => `
                  <div class="item-formacao">
                    <div class="linha-cabecalho">
                      <span class="titulo-cargo">${escapar(f.curso || "Curso")}${
                        f.status
                          ? ` <span style="font-weight: normal; color: #4B5563;">(${escapar(f.status)})</span>`
                          : ""
                      }</span>
                      <span class="data-periodo">${escapar(f.periodo || "Concluído")}</span>
                    </div>
                    ${f.instituicao ? `<p style="margin: 0;">${escapar(f.instituicao)}</p>` : ""}
                  </div>`,
              )
              .join("")}</section>`
          : ""
      }

      ${
        habilidades.length > 0
          ? `<section class="secao"><h2>Habilidades e Competências</h2>
              <div class="habilidades-grid">
                ${habilidades.map((h: string) => `<span class="habilidade-chip">${escapar(h)}</span>`).join("")}
              </div>
            </section>`
          : ""
      }

      ${
        idiomas.length > 0
          ? `<section class="secao"><h2>Idiomas</h2><ul>${idiomas
              .map((i: any) => {
                const nomeIdioma =
                  typeof i === "string" ? i : i.nome || i.idioma || "";
                const nivel = typeof i === "string" ? "" : i.nivel || "";
                return `<li><strong>${escapar(nomeIdioma)}</strong>${nivel ? ` — ${escapar(nivel)}` : ""}</li>`;
              })
              .join("")}</ul></section>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;
}

/* ============================================================
   4) EXTRAÇÃO NORMALIZADA DOS DADOS
   ============================================================ */

export function extrairDadosCurriculo(
  resultadoIA: any,
  jovemData?: any,
  vaga?: any,
) {
  const rawIAData =
    resultadoIA?.curriculoEstruturado ||
    resultadoIA?.resposta?.curriculoEstruturado ||
    resultadoIA?.resposta?.curriculo ||
    resultadoIA?.curriculo ||
    {};

  const nomeReal =
    jovemData?.nome_completo ||
    jovemData?.nome ||
    rawIAData?.dados_pessoais?.nome ||
    rawIAData?.dadosPessoais?.nome ||
    "Candidato Profissional";

  const dp = {
    nome: nomeReal,
    cidade:
      rawIAData?.dados_pessoais?.cidade ||
      rawIAData?.dadosPessoais?.cidade ||
      jovemData?.cidade ||
      "",
    telefone:
      rawIAData?.dados_pessoais?.telefone ||
      rawIAData?.dadosPessoais?.telefone ||
      jovemData?.telefone ||
      "",
    email:
      rawIAData?.dados_pessoais?.email ||
      rawIAData?.dadosPessoais?.email ||
      jovemData?.email ||
      "",
    linkedin:
      rawIAData?.dados_pessoais?.linkedin ||
      rawIAData?.dadosPessoais?.linkedin ||
      jovemData?.linkedin ||
      "",
    github:
      rawIAData?.dados_pessoais?.github ||
      rawIAData?.dadosPessoais?.github ||
      jovemData?.github ||
      "",
  };

  const resumo =
    rawIAData?.resumo_profissional ||
    rawIAData?.resumoProfissional ||
    rawIAData?.resumo ||
    "";

  const expRaw = rawIAData?.experiencias || rawIAData?.experiencia || [];
  const experiencias =
    expRaw.length > 0
      ? expRaw.map((e: any) => {
          let bulletsList: string[] = [];
          if (Array.isArray(e.bullets)) {
            bulletsList = e.bullets.filter(Boolean);
          } else if (Array.isArray(e.descricao)) {
            bulletsList = e.descricao.filter(Boolean);
          } else if (typeof e.descricao === "string" && e.descricao.trim()) {
            bulletsList = e.descricao
              .split("\n")
              .map((b: string) => b.replace(/^[•\-*]\s*/, "").trim())
              .filter(Boolean);
          } else if (typeof e.detalhes === "string" && e.detalhes.trim()) {
            bulletsList = e.detalhes
              .split("\n")
              .map((b: string) => b.replace(/^[•\-*]\s*/, "").trim())
              .filter(Boolean);
          }
          return {
            cargo: e.cargo || e.titulo || "Cargo Profissional",
            empresa: e.empresa || "Empresa / Projeto",
            periodo: e.periodo || "Recente",
            descricao: Array.isArray(e.descricao)
              ? e.descricao.join("\n")
              : e.descricao || e.detalhes || "",
            bullets: bulletsList,
          };
        })
      : [];

  const formRaw = rawIAData?.formacao || rawIAData?.formacao_academica || [];
  const formacao =
    formRaw.length > 0
      ? formRaw.map((f: any) => ({
          curso: f.curso || jovemData?.formacao || "Ensino Médio / Superior",
          instituicao: f.instituicao || "Instituição de Ensino",
          periodo: f.periodo || "Concluído",
          status: f.status || "",
        }))
      : jovemData?.formacao
        ? [
            {
              curso: jovemData.formacao,
              instituicao: jovemData?.instituicao || "Instituição de Ensino",
              periodo: jovemData?.periodo_formacao || "Concluído",
              status: "",
            },
          ]
        : [];

  const habRaw = rawIAData?.habilidades || [];
  const habilidades = Array.isArray(habRaw) ? habRaw.filter(Boolean) : [];

  const idiomasRaw = rawIAData?.idiomas || rawIAData?.idiomas_e_cursos || [];
  const idiomas = Array.isArray(idiomasRaw)
    ? idiomasRaw.map((item: any) =>
        typeof item === "string"
          ? { nome: item, nivel: "" }
          : { nome: item.idioma || item.nome || "", nivel: item.nivel || "" },
      )
    : [];

  return {
    dp,
    nome: dp.nome,
    cidade: dp.cidade,
    telefone: dp.telefone,
    email: dp.email,
    linkedin: dp.linkedin,
    github: dp.github,
    resumo,
    experiencias,
    formacao,
    habilidades,
    idiomas,
  };
}

/* ============================================================
   5) DOWNLOAD DO PDF
   ============================================================ */

function htmlVazio(html: string): boolean {
  if (!html || typeof html !== "string") return true;
  const texto = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texto.length < 20;
}

function nomeArquivoSeguro(nome: string): string {
  return (
    nome
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "") || "profissional"
  );
}

async function gerarPdfFrontend(html: string, nomeBase: string): Promise<void> {
  if (!html || typeof html !== "string" || html.trim().length < 20) {
    throw new Error("HTML do currículo está vazio ou inválido.");
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  document.body.appendChild(container);

  const opt = {
    margin: [14, 16, 14, 16],
    filename: `curriculo-${nomeBase}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 800,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: [".item-experiencia", ".item-formacao", ".secao"],
    },
  };

  try {
    // @ts-ignore
    await html2pdf().set(opt).from(container).save();
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export async function baixarCurriculoPDF(
  resultadoIA: any,
  jovemData?: any,
  vaga?: any,
): Promise<void> {
  const d = extrairDadosCurriculo(resultadoIA, jovemData, vaga);
  const html = renderHtmlCurriculo(d);

  if (htmlVazio(html)) {
    throw new Error(
      "Não foi possível gerar o conteúdo do currículo. Revise os dados e tente novamente.",
    );
  }

  const nomeBase = nomeArquivoSeguro(d.nome);

  let usouBackend = false;
  try {
    const { fetchComTimeoutETentativa } = await import("./apiHelpers");
    const response = await fetchComTimeoutETentativa(
      `${API_BASE_URL}/pdf/curriculo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      },
      60_000,
      2,
    );

    if (!response.ok) {
      const errTxt = await response.text().catch(() => "");
      throw new Error(`Backend ${response.status}: ${errTxt.slice(0, 200)}`);
    }

    const blob = await response.blob();
    if (blob.size < 500) {
      throw new Error("PDF retornado pelo backend está vazio.");
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curriculo-${nomeBase}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 1500);
    usouBackend = true;
  } catch (errBackend) {
    console.warn(
      "[CIJA] Falha no PDF via backend, usando fallback local (html2pdf.js):",
      errBackend,
    );
  }

  if (usouBackend) return;

  try {
    await gerarPdfFrontend(html, nomeBase);
  } catch (errFront: any) {
    console.error("[CIJA] Erro ao gerar PDF no fallback:", errFront);
    throw new Error(
      "Não foi possível gerar o PDF nem no backend nem localmente: " +
        (errFront?.message || "erro desconhecido"),
    );
  }
}

/* ============================================================
   6) GERAÇÃO DO DOCX
   ============================================================ */

export async function baixarCurriculoDOCX(
  resultadoIA: any,
  jovemData?: any,
  vaga?: any,
) {
  const d = extrairDadosCurriculo(resultadoIA, jovemData, vaga);

  const COR_PRIMARIA = "1E3A8A";
  const COR_SECUNDARIA = "2563EB";
  const COR_TEXTO = "1F2937";
  const COR_SUAVES = "6B7280";
  const children: any[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: (d.nome || "Candidato").toUpperCase(),
          bold: true,
          size: 32,
          color: COR_PRIMARIA,
          font: "Calibri",
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      spacing: { after: 120 },
      border: {
        bottom: {
          color: COR_PRIMARIA,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
      children: [new TextRun({ text: "" })],
    }),
  );

  const contatoRuns: TextRun[] = [];
  const camposContato = [
    d.cidade,
    d.telefone,
    d.email,
    d.linkedin,
    d.github,
  ].filter(Boolean) as string[];

  camposContato.forEach((c, i) => {
    if (i > 0) {
      contatoRuns.push(
        new TextRun({
          text: "   |   ",
          size: 18,
          color: COR_SUAVES,
          font: "Calibri",
        }),
      );
    }
    contatoRuns.push(
      new TextRun({
        text: c,
        size: 18,
        color: COR_TEXTO,
        font: "Calibri",
      }),
    );
  });

  if (contatoRuns.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: contatoRuns,
      }),
    );
  }

  if (d.resumo) {
    children.push(criarSecaoDocx("RESUMO PROFISSIONAL", COR_PRIMARIA));
    children.push(
      new Paragraph({
        spacing: { after: 180, line: 276 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: d.resumo,
            size: 20,
            color: COR_TEXTO,
            font: "Calibri",
          }),
        ],
      }),
    );
  }

  if (d.experiencias.length > 0) {
    children.push(criarSecaoDocx("EXPERIÊNCIA PROFISSIONAL", COR_PRIMARIA));

    d.experiencias.forEach((exp: any) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          tabStops: [
            { type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) },
          ],
          children: [
            new TextRun({
              text: exp.cargo,
              bold: true,
              size: 22,
              color: "111827",
              font: "Calibri",
            }),
            new TextRun({ text: "\t", size: 20, font: "Calibri" }),
            new TextRun({
              text: exp.periodo,
              italics: true,
              size: 19,
              color: COR_SUAVES,
              font: "Calibri",
            }),
          ],
        }),
      );

      if (exp.empresa) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: exp.empresa,
                bold: true,
                size: 20,
                color: COR_SECUNDARIA,
                font: "Calibri",
              }),
            ],
          }),
        );
      }

      const bulletsList =
        Array.isArray(exp.bullets) && exp.bullets.length > 0
          ? exp.bullets
          : exp.descricao
            ? [exp.descricao]
            : [];
      bulletsList.forEach((b: string) => {
        children.push(
          new Paragraph({
            spacing: { after: 30, line: 260 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: b,
                size: 20,
                color: COR_TEXTO,
                font: "Calibri",
              }),
            ],
          }),
        );
      });
    });
  }

  if (d.formacao.length > 0) {
    children.push(criarSecaoDocx("FORMAÇÃO ACADÊMICA", COR_PRIMARIA));

    d.formacao.forEach((form: any) => {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
          tabStops: [
            { type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) },
          ],
          children: [
            new TextRun({
              text: form.curso,
              bold: true,
              size: 21,
              color: "111827",
              font: "Calibri",
            }),
            form.status
              ? new TextRun({
                  text: ` (${form.status})`,
                  size: 19,
                  color: COR_SUAVES,
                  font: "Calibri",
                })
              : new TextRun({ text: "", size: 19, font: "Calibri" }),
            new TextRun({ text: "\t", size: 19, font: "Calibri" }),
            new TextRun({
              text: form.periodo,
              italics: true,
              size: 19,
              color: COR_SUAVES,
              font: "Calibri",
            }),
          ],
        }),
      );

      if (form.instituicao) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: form.instituicao,
                size: 19,
                color: "4B5563",
                font: "Calibri",
              }),
            ],
          }),
        );
      }
    });
  }

  if (d.habilidades.length > 0) {
    children.push(criarSecaoDocx("HABILIDADES E COMPETÊNCIAS", COR_PRIMARIA));

    const porLinha = 3;
    for (let i = 0; i < d.habilidades.length; i += porLinha) {
      const bloco = d.habilidades.slice(i, i + porLinha);
      const runs: TextRun[] = [];
      bloco.forEach((hab: string, idx: number) => {
        if (idx > 0) {
          runs.push(
            new TextRun({
              text: "  •  ",
              size: 19,
              color: COR_SUAVES,
              font: "Calibri",
            }),
          );
        }
        runs.push(
          new TextRun({
            text: hab,
            size: 19,
            bold: true,
            color: COR_PRIMARIA,
            font: "Calibri",
          }),
        );
      });

      children.push(
        new Paragraph({
          spacing: { after: 60, line: 280 },
          alignment: AlignmentType.LEFT,
          children: runs,
        }),
      );
    }
  }

  if (d.idiomas.length > 0) {
    children.push(criarSecaoDocx("IDIOMAS", COR_PRIMARIA));

    d.idiomas.forEach((idioma: any) => {
      children.push(
        new Paragraph({
          spacing: { after: 40, line: 260 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: idioma.nome || idioma.idioma,
              bold: true,
              size: 20,
              color: COR_TEXTO,
              font: "Calibri",
            }),
            idioma.nivel
              ? new TextRun({
                  text: ` — ${idioma.nivel}`,
                  size: 20,
                  color: COR_SUAVES,
                  font: "Calibri",
                })
              : new TextRun({ text: "", size: 20, font: "Calibri" }),
          ],
        }),
      );
    });
  }

  const doc = new Document({
    creator: "CIJA",
    title: `Currículo — ${d.nome}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        children,
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curriculo-${nomeArquivoSeguro(d.nome)}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 1500);
  } catch (error: unknown) {
    console.error("Erro ao gerar DOCX:", error);
    throw new Error("Falha ao gerar DOCX");
  }
}

export function criarSecaoDocx(titulo: string, cor: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { color: "E5E7EB", space: 4, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text: titulo,
        bold: true,
        size: 22,
        color: cor,
        font: "Calibri",
      }),
    ],
  });
}
