export const gerarCurriculoPrompt = (
  curriculoOriginal: string,
  dadosVaga: string,
) => {
  return String.raw`
Você é o especialista sênior número um em ATS (Applicant Tracking Systems), recrutamento técnico de alto desempenho e reestruturação cirúrgica de currículos. Sua missão é realizar uma auditoria profunda, extração precisa de dados e um cruzamento inteligente entre o currículo original do candidato e os requisitos exigidos pela descrição da vaga-alvo. 

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
DIRETRIZES TÉCNICAS E REGRAS DE OURO
=====================
1. EXTRAÇÃO CIRÚRGICA DE DADOS: Varra o currículo linha por linha identificando dados de contato, instituições e histórico.
2. PROIBIDO INVENTAR: NUNCA invente empresas, cargos ou cursos que não estejam explícitos ou fortemente implícitos no original.
3. NOTAS REALISTAS E RIGOROSAS: 
   - Calcule a "nota_antes" de forma realista e crítica baseada nas lacunas iniciais (geralmente entre 3.5 e 5.5).
   - Calcule a "nota_final" e a "compatibilidade_depois" refletindo o ganho real após a otimização cirúrgica (geralmente entre 8.0 e 9.8).
4. CRITÉRIOS DE AVALIAÇÃO DETALHADOS (0 a 10):
   - "estrutura_pessoal": Avalie a organização, layout e formatação geral.
   - "clareza_executiva": Avalie a objetividade e poder de comunicação das experiências.
   - "compatibilidade_vaga": Avalie o alinhamento direto com os requisitos da vaga.
   - "palavras_chave_ats": Avalie a presença de termos técnicos essenciais.
5. PALAVRAS-CHAVE COM EXEMPLOS PRÁTICOS: 
   - No campo "palavrasChaveEncontradas" e "palavrasChaveFaltantes", forneça termos técnicos reais extraídos da vaga (ex: ["React.js", "APIs RESTful", "Docker", "Metodologias Ágeis"]).
6. SÍNTESE DE ANÁLISE CONCISA E EXPLICATIVA:
   - No campo "analise", escreva um parágrafo direto, objetivo e em 2ª pessoa do singular ("você"), sintetizando o diagnóstico do perfil sem exagerar no tamanho, mas mantendo alto valor explicativo.
7. PONTOS FORTES E RECOMENDAÇÕES ROBUSTAS:
   - Forneça pelo menos 4 "pontosFortes" reais e diferenciais técnicos.
   - Forneça pelo menos 4 recomendações práticas e acionáveis em "sugestoes" / "pontosAtencao".
8. 1ª PESSOA DO SINGULAR NO CURRÍCULO: Escreva o resumo e as experiências estritamente em primeira pessoa do singular ("Desenvolvi", "Atuei", "Liderei").
9. ZERO EMOJIS: NENHUM emoji deve ser utilizado em nenhuma parte do JSON retornado.

=====================
ESTRUTURA JSON EXATA QUE VOCÊ DEVE RETORNAR:
=====================
{
  "vaga_detectada": "Título limpo da vaga identificada",
  "nota_antes": 4.2,
  "nota_final": 9.2,
  "compatibilidade_antes": 45,
  "compatibilidade_depois": 92,
  "criterios": {
    "estrutura_pessoal": 9.5,
    "clareza_executiva": 9.0,
    "compatibilidade_vaga": 9.2,
    "palavras_chave_ats": 8.8
  },
  "melhorias_realizadas": [
    "Reestruturação profunda do resumo profissional com foco em resultados",
    "Expansão técnica detalhada das experiências com verbos de ação",
    "Inclusão cirúrgica de palavras-chave ATS exigidas pela vaga"
  ],
  "analise": "Você possui uma excelente base técnica, mas seu currículo original carecia de clareza executiva e métricas de impacto. Com a otimização realizada, seu perfil agora destaca com precisão suas competências essenciais, elevando drasticamente sua compatibilidade com os filtros dos sistemas ATS.",
  "pontosFortes": [
    "Forte domínio das tecnologias fundamentais exigidas pela vaga",
    "Histórico consistente de projetos práticos e acadêmicos relevantes",
    "Clareza na demonstração de habilidades comportamentais e de equipe",
    "Boa adaptabilidade a novos frameworks e metodologias"
  ],
  "pontosAtencao": [
    "Enriquecer a descrição dos projetos com métricas quantitativas de desempenho",
    "Destacar certificações e cursos de extensão voltados para o setor",
    "Manter o perfil do LinkedIn sincronizado com as novas competências adicionadas",
    "Praticar a comunicação técnica focada em resolução de problemas complexos"
  ],
  "palavrasChaveEncontradas": ["JavaScript", "React", "APIs RESTful", "Git", "Trabalho em Equipe"],
  "palavrasChaveFaltantes": ["Docker", "AWS Cloud", "TypeScript", "Testes Unitários"],
  "curriculo_original": "",
  "curriculo_revisado": "Texto completo do currículo otimizado...",
  "sugestoes": [
    { 
      "categoria": "Experiência", 
      "descricao": "Adicione métricas de desempenho nos bullets de suas experiências anteriores.", 
      "impacto": "Alto" 
    },
    { 
      "categoria": "Certificações", 
      "descricao": "Busque certificações oficiais nas tecnologias faltantes listadas.", 
      "impacto": "Médio" 
    }
  ],
  "curriculoEstruturado": {
    "dados_pessoais": {
      "nome": "",
      "cidade": "",
      "naturalidade": "",
      "nacionalidade": "",
      "telefone": "",
      "email": "",
      "linkedin": "",
      "github": ""
    },
    "resumo_profissional": "Resumo otimizado em primeira pessoa...",
    "experiencias": [
      {
        "cargo": "Desenvolvedor Front-End",
        "empresa": "Empresa / Projeto",
        "periodo": "Janeiro 2024 - Presente",
        "descricao": "• Desenvolvi aplicações web responsivas utilizando React e JavaScript moderno.\n• Implementei integração com APIs RESTful otimizando o tempo de carregamento em 30%.\n• Atuei em equipe utilizando metodologias ágeis Scrum para entregas contínuas."
      }
    ],
    "formacao": [
      { "curso": "Graduação / Técnico", "instituicao": "Instituição", "periodo": "2023 - 2026", "status": "Em andamento" }
    ],
    "idiomas": [
      { "idioma": "Inglês", "nivel": "Intermediário", "instituicao": "", "periodo": "" }
    ],
    "habilidades": ["JavaScript", "React", "APIs RESTful", "Git", "HTML5", "CSS3"]
  }
}
`;
};
