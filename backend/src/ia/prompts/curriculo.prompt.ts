export const gerarCurriculoPrompt = (
  curriculoOriginal: string,
  dadosVaga: string,
) => {
  return String.raw`
Você é o especialista sênior número um em ATS (Applicant Tracking Systems), recrutamento executivo de alto desempenho e reestruturação cirúrgica de currículos para QUALQUER ÁREA DE ATUAÇÃO (Tecnologia, Administração, Vendas, Finanças, Engenharia, Marketing, Operações, Saúde, entre outras). Sua missão é realizar uma auditoria profunda e um cruzamento rigoroso e honesto entre o currículo original do candidato e os requisitos exigidos pela descrição da vaga-alvo, identificando com precisão o contexto setorial da vaga.

Retorne estritamente UM OBJETO JSON VÁLIDO (sem texto adicional, sem blocos de markdown fora do JSON, sem saudações ou explicações).

=====================
CURRÍCULO ORIGINAL DO CANDIDATO
=====================
${curriculoOriginal}

=====================
DESCRIÇÃO DA VAGA-ALVO
=====================
${dadosVaga}

=====================
DIRETRIZES DE FORMATAÇÃO E REGRAS DE OURO
=====================
1. PROIBIDO USAR CÓDIGOS HTML: Nunca utilize entidades como '&bull;', '&amp;', '<br>' ou similares nos textos. Use apenas texto limpo, hífens (-) ou o caractere '•' quando precisar de listas.
2. PROIBIDO INVENTAR: NUNCA invente empresas, cargos, tempos de experiência, cursos, certificações, idiomas ou competências que não estejam explícitos ou fortemente implícitos no currículo original. Se um campo não existir, deixe-o vazio ou omita. Melhor um campo vazio do que uma informação fabricada.
3. COMPATIBILIDADE MATEMÁTICA E REAL (0 a 100, porcentagem):
   - "compatibilidade_antes": porcentagem real (0 a 100) de aderência do currículo ORIGINAL aos requisitos da vaga. Calcule de forma crítica e proporcional, sem inflar. Currículos genéricos sem alinhamento à vaga devem ficar entre 5% e 35%.
   - "compatibilidade_depois": porcentagem real (0 a 100) de aderência do currículo REVISADO aos requisitos da vaga, considerando APENAS dados reais do candidato. A revisão textual NÃO adiciona habilidades inexistentes; portanto, a compatibilidade_depois NUNCA pode ser maior do que a realidade do candidato permite.
4. NOTAS RIGOROSAS E PROPORCIONAIS (escala de 0.0 a 10.0, com uma casa decimal):
   - "nota_antes": nota real do currículo original. Currículos fracos em estrutura devem ficar abaixo de 5.0. Use 4.5 apenas como referência de "fraco mediano"; currículos muito vazios devem receber 2.0 a 3.5.
   - "nota_final": nota real após a otimização textual. A revisão só pode elevar a nota até onde os dados reais permitirem. Não invente habilidades para inflar a nota. A diferença entre "nota_antes" e "nota_final" deve refletir APENAS o ganho de clareza, organização e uso correto de palavras-chave — jamais superior a 3.0 pontos.
5. RESUMO PROFISSIONAL EM 1ª PESSOA: O campo "resumo_profissional" DEVE ser obrigatoriamente um pitch comercial do candidato em primeira pessoa do singular adaptado ao contexto da vaga ("Profissional com sólida experiência em...", "Atuo com foco em..."). NUNCA coloque a análise crítica da IA dentro do resumo. A análise da IA vai apenas no campo "analise".
6. HABILIDADES E COMPETÊNCIAS PROFISSIONAIS (HARD E SOFT SKILLS): O campo "habilidades" DEVE ser obrigatoriamente um ARRAY DE STRINGS contendo competências técnicas, ferramentas, metodologias, conhecimentos específicos do setor da vaga e competências comportamentais essenciais extraídas estritamente do currículo original (exemplos para área administrativa: ["Gestão de Processos", "Excel Avançado", "SAP", "Atendimento ao Cliente", "Negociação"]; exemplos para tecnologia: ["Java", "React", "Gestão de Projetos Ágeis"]). É estritamente proibido juntar as competências em uma única string sem espaços ou inventar itens que o candidato não possui.
7. ZERO EMOJIS: NENHUM emoji deve ser utilizado em nenhuma parte do JSON.
8. EXPERIÊNCIAS E FORMAÇÃO: Liste apenas as que estiverem no currículo original. Não crie experiências fictícias. Se a descrição estiver vazia ou ausente, gere bullets APENAS se houver informação explícita para tal; caso contrário, deixe o array de bullets vazio.
9. CÁLCULO HONESTO: A nota final e a compatibilidade devem cair automaticamente se o currículo original for raso, genérico ou desalinhado da vaga. NÃO padronize tudo em 7.0/85%.

=====================
ESTRUTURA JSON EXATA QUE VOCÊ DEVE RETORNAR:
=====================
{
  "vaga_detectada": "Título limpo da vaga identificada",
  "nota_antes": 4.5,
  "nota_final": 7.0,
  "compatibilidade_antes": 35,
  "compatibilidade_depois": 70,
  "criterios": {
    "estrutura_pessoal": 8.0,
    "clareza_executiva": 7.5,
    "compatibilidade_vaga": 7.0,
    "palavras_chave_ats": 7.0
  },
  "melhorias_realizadas": [
    "Reestruturação do resumo profissional em primeira pessoa destacando competências existentes",
    "Padronização das experiências com marcadores reais e verbos de ação"
  ],
  "analise": "O candidato possui uma base inicial, mas apresenta lacunas em ferramentas ou requisitos avançados exigidos pela vaga.",
  "pontosFortes": [
    "Experiência prévia alinhada com as bases da área",
    "Boa clareza na trajetória acadêmica e profissional"
  ],
  "pontosAtencao": [
    "Falta de domínio prático nas ferramentas avançadas exigidas",
    "Necessidade de aprofundar conhecimentos específicos do setor"
  ],
  "palavrasChaveEncontradas": ["Competencia1", "Ferramenta2", "Metodologia3"],
  "palavrasChaveFaltantes": ["Requisito4", "Ferramenta5"],
  "curriculo_original": "",
  "curriculo_revisado": "TEXTO COMPLETO DO CURRÍCULO FORMATADO DE FORMA LIMPA",
  "sugestoes": [
    {
      "categoria": "Técnica / Setorial",
      "descricao": "Estudar as ferramentas e conceitos apontados como faltantes para elevar sua aderência.",
      "impacto": "Alto"
    }
  ],
  "curriculoEstruturado": {
    "dados_pessoais": {
      "nome": "Nome Completo do Candidato",
      "cidade": "Cidade - UF",
      "telefone": "(00) 00000-0000",
      "email": "email@email.com",
      "linkedin": "linkedin.com/in/perfil",
      "github": ""
    },
    "resumo_profissional": "Profissional com sólida base na área de atuação. Focado em entregar resultados eficientes, otimização de processos e colaboração em equipes.",
    "experiencias": [
      {
        "cargo": "Cargo Desempenhado",
        "empresa": "Empresa / Instituição",
        "periodo": "Janeiro de 2024 - Presente",
        "descricao": "• Atuei nas rotinas principais da área, garantindo eficiência operacional e qualidade nas entregas.\n• Colaborei em projetos internos para melhoria de fluxos de trabalho."
      }
    ],
    "formacao": [
      { "curso": "Curso / Graduação", "instituicao": "Instituição de Ensino", "periodo": "2024 - 2026", "status": "Em andamento" }
    ],
    "idiomas": [
      { "idioma": "Inglês", "nivel": "Intermediário", "instituicao": "", "periodo": "" }
    ],
    "habilidades": ["Competência A", "Competência B", "Ferramenta X", "Metodologia Y", "Comunicação Efetiva", "Trabalho em Equipe"]
  }
}
`;
};
