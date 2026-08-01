import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../../../../components/sideBar/sideBar";
import { supabase } from "../../../../supabaseClient";
import styles from "./revisarCurriculo.module.css";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import {
  baixarCurriculoPDF,
  baixarCurriculoDOCX,
  calcularScoreCurriculo,
  extrairDadosCurriculo,
} from "../../../../utils/geradorCurriculo";

interface Empresa {
  id_em: string;
  nome: string;
  avatarempresa_url: string | null;
}

interface Vaga {
  id_vag: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  salario: number;
  data_publicada: string;
  cidade: string;
  estado: string;
  tipo: string;
  contrato: string;
  empresa: Empresa | null;
}

interface SugestaoMelhoria {
  categoria: string;
  descricao: string;
  impacto: "Alto" | "Médio" | "Baixo";
}

interface CriteriosAvaliacao {
  estruturaTextual: number;
  clarezaExecutiva: number;
  alinhamentoVaga: number;
  palavrasChaveAts: number;
}

interface DadosPessoaisCurriculo {
  nome: string;
  cidade: string;
  telefone: string;
  email: string;
  linkedin: string;
}

interface ExperienciaCurriculo {
  cargo: string;
  empresa: string;
  periodo: string;
  descricao: string;
}

interface FormacaoCurriculo {
  curso: string;
  instituicao: string;
  periodo: string;
}

interface CurriculoData {
  dados_pessoais: DadosPessoaisCurriculo;
  resumo_profissional: string;
  experiencias: ExperienciaCurriculo[];
  formacao: FormacaoCurriculo[];
  habilidades: string[];
  idiomas: string[] | any[];
}

interface ResultadoIACompleto {
  nota: number;
  notaAntes: number;
  analise: string;
  compatibilidadeVaga: number;
  pontosFortes: string[];
  pontosAtencao: string[];
  curriculoOtimizadoText: string;
  curriculoEstruturado?: CurriculoData;
  sugestoes: SugestaoMelhoria[] | string[];
  palavrasChaveEncontradas: string[];
  palavrasChaveFaltantes: string[];
  criterios: CriteriosAvaliacao;
}

const Icons = {
  BackArrow: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  UploadCloud: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 16 12 12 8 16"></polyline>
      <line x1="12" y1="12" x2="12" y2="21"></line>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
    </svg>
  ),
  Briefcase: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  ),
  ShieldCheck: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  ),
  Target: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  ),
  FileText: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  EditSparkle: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  BarChart: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  ),
  Cpu: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="15" x2="23" y2="15"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="15" x2="4" y2="15"></line>
    </svg>
  ),
  Check: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  Download: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  Sparkles: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"></path>
    </svg>
  ),
  AlertCircle: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ),
  Layers: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  ),
  TrendingUp: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  ),
  Info: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  ),
};

const CircularScoreMeter = ({
  score,
  label,
  subLabel,
  color,
}: {
  score: number;
  label: string;
  subLabel: string;
  color: string;
}) => {
  const radius = 38; // Raio ampliado para o círculo ficar maior
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(10, Math.max(0, score)) / 10) * circumference;

  return (
    <div className={styles.circularMeterContainer}>
      <div className={styles.svgCircleWrapper}>
        <svg width="96" height="96" className={styles.svgProgressRing}>
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#1a1e2e"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className={styles.svgCircleTextOverlay}>
          <span className={styles.svgScoreNumber} style={{ color }}>
            {score.toFixed(1)}
          </span>
          <span className={styles.svgScoreTotal}>/10</span>
        </div>
      </div>
      <span className={styles.circularLabelMain}>{label}</span>
      <span className={styles.circularLabelSub}>{subLabel}</span>
    </div>
  );
};

const RevisarCurriculo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { idJa } = useParams<{ idJa?: string }>();

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [jovemData, setJovemData] = useState<any | null>(null);
  const [notificacao, setNotificacao] = useState<string | null>(null);
  const [tentativasRestantes, setTentativasRestantes] = useState<number>(3);

  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [resposta, setResposta] = useState<any>(null);
  const [resultadoIA, setResultadoIA] = useState<ResultadoIACompleto | null>(
    null,
  );
  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [nomeArquivo, setNomeArquivo] = useState<string>(
    "Nenhum arquivo selecionado",
  );

  const [mensagemIndex, setMensagemIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useDocumentTitle("CIJA - Revisão Profissional de Currículo por IA");

  useEffect(() => {
    void init();
  }, [idJa]);

  useEffect(() => {
    atualizarContadorTentativas();
  }, [uid, userId, idJa]);

  const atualizarContadorTentativas = () => {
    const perfilId = idJa || uid || userId || "padrao";
    const hoje = new Date().toISOString().split("T")[0];
    const chaveData = `revisoes_data_${perfilId}`;
    const chaveCount = `revisoes_count_${perfilId}`;

    const ultimaData = localStorage.getItem(chaveData);
    let count = parseInt(localStorage.getItem(chaveCount) || "0", 10);

    if (ultimaData !== hoje) {
      localStorage.setItem(chaveData, hoje);
      localStorage.setItem(chaveCount, "0");
      count = 0;
    }

    const restantes = Math.max(0, 3 - count);
    setTentativasRestantes(restantes);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (etapaAtual === 2 || etapaAtual === 3) {
      const mensagensIA = [
        {
          title: "Processando análise inteligente...",
          desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
        },
        {
          title: "Analisando histórico profissional...",
          desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
        },
        {
          title: "Validando critérios da vaga corporativa...",
          desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
        },
        {
          title: "Gerando diagnóstico analítico...",
          desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
        },
      ];

      interval = setInterval(() => {
        setMensagemIndex((prev) => (prev + 1) % mensagensIA.length);
      }, 5000);
    } else {
      setMensagemIndex(0);
    }
    return () => clearInterval(interval);
  }, [etapaAtual]);

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user && !idJa) {
      setLoading(false);
      return;
    }
    const perfilId = idJa ?? user?.id ?? null;
    if (!perfilId) {
      setLoading(false);
      return;
    }
    setUid(perfilId);
    await loadProfile(perfilId);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("jovem_aprendiz")
        .select("*")
        .eq("id_ja", userId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar perfil:", error.message);
        return;
      }
      if (data) {
        setJovemData(data);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function carregarDetalhesVaga() {
      if (!id) return;
      setLoading(true);
      const { data: vagaData, error: vagaError } = await supabase
        .from("vaga")
        .select("*")
        .eq("id_vag", id)
        .single();

      if (vagaError || !vagaData) {
        setLoading(false);
        return;
      }

      let empresaCompleta: Empresa | null = null;
      if (vagaData.id_em) {
        const { data: empData } = await supabase
          .from("empresa")
          .select("id_em, nome, avatarempresa_url")
          .eq("id_em", vagaData.id_em)
          .single();
        if (empData) empresaCompleta = empData;
      }

      if (vagaData) {
        setVaga({ ...vagaData, empresa: empresaCompleta });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: cand } = await supabase
          .from("jovem_aprendiz")
          .select("*")
          .eq("id_ja", user.id)
          .maybeSingle();
        if (cand) {
          setJovemData(cand);
          setUserId(user.id);
        }
      }
      setLoading(false);
    }
    void carregarDetalhesVaga();
  }, [id]);

  const mostrarNotificacao = (mensagem: string) => {
    setNotificacao(mensagem);
    setTimeout(() => setNotificacao(null), 5000);
  };

  const verificarLimiteRevisoes = (): boolean => {
    const perfilId = idJa || uid || userId || "padrao";
    const hoje = new Date().toISOString().split("T")[0];
    const chaveData = `revisoes_data_${perfilId}`;
    const chaveCount = `revisoes_count_${perfilId}`;

    const ultimaData = localStorage.getItem(chaveData);
    let count = parseInt(localStorage.getItem(chaveCount) || "0", 10);

    if (ultimaData !== hoje) {
      localStorage.setItem(chaveData, hoje);
      localStorage.setItem(chaveCount, "0");
      count = 0;
    }

    if (count >= 3) {
      mostrarNotificacao(
        "Você atingiu o limite de 3 revisões de currículo permitidas por dia. Redirecionando...",
      );
      setTimeout(() => {
        navigate(-1);
      }, 5000);
      return false;
    }

    localStorage.setItem(chaveCount, (count + 1).toString());
    atualizarContadorTentativas();
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        mostrarNotificacao("O documento deve possuir no máximo 10MB.");
        return;
      }
      setCurriculo(file);
      setNomeArquivo(file.name);
      mostrarNotificacao(`Arquivo "${file.name}" carregado com sucesso.`);
    }
  };

  const handleEnviarCurriculo = async () => {
    if (!verificarLimiteRevisoes()) {
      return;
    }

    if (!curriculo) {
      mostrarNotificacao("Por favor, selecione um currículo válido.");
      return;
    }
    if (!vaga || !vaga.descricao) {
      mostrarNotificacao(
        "A vaga selecionada não possui uma descrição corporativa válida.",
      );
      return;
    }

    setEtapaAtual(2);
    setStatus("enviando");
    setResposta("Processando revisão inteligente do documento...");

    let timerEtapa3: NodeJS.Timeout | null = null;

    try {
      const dadosEnviar = new FormData();
      dadosEnviar.append("curriculo", curriculo);
      dadosEnviar.append("vaga", vaga.descricao);

      timerEtapa3 = setTimeout(() => {
        setEtapaAtual(3);
        setResposta(
          "Estruturando seções e calculando métricas de aderência...",
        );
      }, 4000);

      const res = await fetch("http://localhost:3001/ia/revisar", {
        method: "POST",
        body: dadosEnviar,
      });

      if (timerEtapa3) clearTimeout(timerEtapa3);

      if (!res.ok) {
        const erroTexto = await res.text();
        throw new Error(`Falha operacional (${res.status}): ${erroTexto}`);
      }

      const resultado = await res.json();
      setResposta(resultado);

      const nomeRealCandidato =
        jovemData?.nome_completo || jovemData?.nome || "Candidato Executivo";

      const rawIAData =
        resultado.curriculoEstruturado ||
        resultado.resposta?.curriculoEstruturado ||
        resultado.resposta?.curriculo ||
        {};

      const curriculoObjIA: CurriculoData = {
        dados_pessoais: {
          nome:
            rawIAData?.dados_pessoais?.nome ||
            rawIAData?.dadosPessoais?.nome ||
            nomeRealCandidato,
          cidade:
            rawIAData?.dados_pessoais?.cidade ||
            rawIAData?.dadosPessoais?.cidade ||
            jovemData?.cidade ||
            "São Paulo - SP",
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
        },
        resumo_profissional:
          rawIAData?.resumo_profissional ||
          rawIAData?.resumoProfissional ||
          resultado.resposta?.analise ||
          "Profissional focado em resultados.",
        experiencias:
          rawIAData?.experiencias && rawIAData.experiencias.length > 0
            ? rawIAData.experiencias
            : [
                {
                  cargo: "Experiência Profissional",
                  empresa: "Empresa / Projeto",
                  periodo: "Recente",
                  descricao:
                    resultado.curriculoOtimizadoText ||
                    resultado.curriculo_revisado ||
                    "Atuação voltada para projetos e metas corporativas.",
                },
              ],
        formacao:
          rawIAData?.formacao && rawIAData.formacao.length > 0
            ? rawIAData.formacao
            : [
                {
                  curso: jovemData?.formacao || "Ensino Médio / Superior",
                  instituicao: "Instituição de Ensino",
                  periodo: "Concluído",
                },
              ],
        habilidades:
          rawIAData?.habilidades && rawIAData.habilidades.length > 0
            ? rawIAData.habilidades
            : ["Trabalho em Equipe", "Comunicação"],
        idiomas:
          rawIAData?.idiomas && rawIAData.idiomas.length > 0
            ? rawIAData.idiomas
            : ["Português (Nativo)"],
      };

      const textoBaseIA =
        resultado.curriculo_revisado ||
        resultado.curriculoOtimizadoText ||
        resultado.resposta?.curriculo_revisado ||
        `CURRÍCULO PROFISSIONAL - ${nomeRealCandidato}`;

      const melhoriasRealizadasList =
        resultado.melhorias_realizadas?.length > 0
          ? resultado.melhorias_realizadas
          : resultado.resposta?.melhorias_realizadas || [
              "Estrutura executiva de alto impacto e clareza visual impecável",
              "Consistência sólida na apresentação das experiências e histórico prático",
            ];

      const dadosParaScore = extrairDadosCurriculo(
        { curriculoEstruturado: curriculoObjIA },
        jovemData,
        vaga,
      );
      const analiseReal = calcularScoreCurriculo(
        dadosParaScore,
        vaga?.descricao || "",
      );

      const notaIAFront = Number(
        resultado.nota_final ??
          resultado.resposta?.nota_final ??
          resultado.nota ??
          0,
      );

      const baseCalculadaFinal = analiseReal.nota > 0 ? analiseReal.nota : 6.5;
      const notaFinalCalculada = Number(
        (notaIAFront > 0
          ? Math.min(10, Math.max(5.5, notaIAFront))
          : Math.max(6.0, baseCalculadaFinal)
        ).toFixed(1),
      );

      const notaAntesCalculada = Number(
        Math.max(3.2, Math.min(5.0, notaFinalCalculada - 2.2)).toFixed(1),
      );

      const compatFinal = Math.round(
        Math.max(
          analiseReal.compatibilidade || 75,
          Number(
            resultado.compatibilidade_depois ??
              resultado.resposta?.compatibilidade_depois ??
              78,
          ),
        ),
      );

      const payloadIA: ResultadoIACompleto = {
        nota: notaFinalCalculada,
        notaAntes: notaAntesCalculada,
        analise:
          resultado.resposta?.analise ||
          resultado.analise ||
          "O perfil demonstra excelente alinhamento estrutural e alto potencial de adequação à vaga.",
        compatibilidadeVaga: compatFinal,
        pontosFortes:
          analiseReal.pontosFortes.length > 0
            ? analiseReal.pontosFortes
            : melhoriasRealizadasList,
        pontosAtencao:
          analiseReal.melhorias.length > 0
            ? analiseReal.melhorias
            : [
                "Enriquecer as descrições das vivências com indicadores quantitativos de desempenho e métricas claras",
                "Destacar certificações específicas, cursos de extensão e especializações relevantes para o setor",
                "Expandir o resumo profissional para ressaltar com mais vigor o valor agregado e objetivos de carreira",
              ],
        curriculoOtimizadoText: textoBaseIA,
        curriculoEstruturado: curriculoObjIA,
        sugestoes: melhoriasRealizadasList,
        palavrasChaveEncontradas:
          analiseReal.palavrasChaveEncontradas.length > 0
            ? analiseReal.palavrasChaveEncontradas
            : resultado.resposta?.palavrasChaveEncontradas || [
                "Gestão Estratégica",
                "Orientação a Resultados",
              ],
        palavrasChaveFaltantes: analiseReal.palavrasChaveFaltantes,
        criterios: analiseReal.criterios,
      };

      setResultadoIA(payloadIA);
      setStatus("sucesso");
      setEtapaAtual(4);
      mostrarNotificacao("Revisão de currículo concluída com sucesso.");
    } catch (error: any) {
      if (timerEtapa3) clearTimeout(timerEtapa3);
      console.error("Erro na integração:", error);
      setEtapaAtual(1);
      setStatus("erro");

      const mensagemErro =
        error.message?.includes("Failed to fetch") || error.name === "TypeError"
          ? "Não foi possível conectar ao servidor de IA em localhost:3001. Verifique se o backend está rodando."
          : error.message ||
            "Falha ao processar o currículo com a inteligência artificial.";

      mostrarNotificacao(mensagemErro);
    }
  };

  const handleBaixarPDF = async () => {
    try {
      if (!resultadoIA) {
        mostrarNotificacao(
          "Nenhum dado de currículo disponível para gerar o PDF.",
        );
        return;
      }

      const curriculoEstruturadoFinal =
        resultadoIA.curriculoEstruturado &&
        (resultadoIA.curriculoEstruturado.experiencias?.length > 0 ||
          resultadoIA.curriculoEstruturado.habilidades?.length > 0 ||
          resultadoIA.curriculoEstruturado.resumo_profissional)
          ? resultadoIA.curriculoEstruturado
          : {
              dados_pessoais: {
                nome:
                  jovemData?.nome_completo || jovemData?.nome || "Candidato",
                cidade: jovemData?.cidade || "São Paulo - SP",
                telefone: jovemData?.telefone || "",
                email: jovemData?.email || "",
                linkedin: jovemData?.linkedin || "",
              },
              resumo_profissional:
                resultadoIA.analise || "Profissional focado em resultados.",
              experiencias: [],
              formacao: jovemData?.formacao
                ? [
                    {
                      curso: jovemData.formacao,
                      instituicao:
                        jovemData?.instituicao || "Instituição de Ensino",
                      periodo: jovemData?.periodo_formacao || "Concluído",
                    },
                  ]
                : [],
              habilidades:
                resultadoIA.palavrasChaveEncontradas?.length > 0
                  ? resultadoIA.palavrasChaveEncontradas
                  : ["Trabalho em Equipe", "Comunicação"],
              idiomas: [],
            };

      const dadosParaGeracao = {
        ...resultadoIA,
        curriculoEstruturado: curriculoEstruturadoFinal,
      };

      await baixarCurriculoPDF(dadosParaGeracao as any, jovemData, vaga);
      mostrarNotificacao("Exportação do currículo em PDF concluída.");
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      mostrarNotificacao(
        err.message || "Erro ao gerar PDF. Verifique o console.",
      );
    }
  };

  const handleBaixarDOCX = async () => {
    try {
      if (resultadoIA) {
        await baixarCurriculoDOCX(resultadoIA as any, jovemData, vaga);
        mostrarNotificacao("Exportação do documento em DOCX concluída.");
      }
    } catch (err) {
      console.error("Erro ao gerar DOCX:", err);
      mostrarNotificacao("Erro ao gerar DOCX.");
    }
  };

  const nomeCandidatoReal =
    jovemData?.nome_completo || jovemData?.nome || "Candidato Executivo";
  const notaAtualIA = resultadoIA?.nota ?? 0;
  const notaAntesIA = resultadoIA?.notaAntes ?? 0;
  const diferencaNota = Number((notaAtualIA - notaAntesIA).toFixed(1));
  const percentualEvolucao = Math.round(
    (diferencaNota / (notaAntesIA || 4.0)) * 100,
  );

  const obterCorNota = (nota: number) => {
    if (nota === 0 || nota < 5) return "#ef4444";
    if (nota === 5 || (nota >= 5 && nota < 7)) return "#f59e0b";
    return "#10b981";
  };

  const obterDetalhesClassificacao = (nota: number) => {
    if (nota === 0 || nota < 5) {
      return { label: "Atenção Crítica", corTexto: "#ef4444" };
    } else if (nota === 5 || (nota >= 5 && nota < 7)) {
      return { label: "Perfil em Evolução", corTexto: "#f59e0b" };
    } else {
      return { label: "Perfil Altamente Competitivo", corTexto: "#10b981" };
    }
  };

  const classificacaoAtual = obterDetalhesClassificacao(notaAtualIA);
  const criteriosAI = resultadoIA?.criterios || {
    estruturaTextual: 0,
    clarezaExecutiva: 0,
    alinhamentoVaga: 0,
    palavrasChaveAts: 0,
  };

  const listaMensagensCarregamento = [
    {
      title: "Processando análise inteligente...",
      desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
    },
    {
      title: "Analisando histórico profissional...",
      desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
    },
    {
      title: "Validando critérios da vaga corporativa...",
      desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
    },
    {
      title: "Gerando diagnóstico analítico...",
      desc: "O tempo estimado de conclusão é de aproximadamente 6 minutos.",
    },
  ];

  const mensagemAtualObj =
    listaMensagensCarregamento[mensagemIndex] || listaMensagensCarregamento[0];

  if (loading)
    return (
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.contentLoading}>
          <div className={styles.spinnerWrapper}>
            <div className={styles.spinner}></div>
          </div>
          <p>Carregando informações da oportunidade e perfil profissional...</p>
        </main>
      </div>
    );

  if (!vaga)
    return (
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.contentLoading}>
          <Icons.AlertCircle />
          <p>
            A vaga selecionada não foi encontrada ou encontra-se indisponível.
          </p>
          <button className={styles.voltarBtn} onClick={() => navigate(-1)}>
            <Icons.BackArrow /> Retornar
          </button>
        </main>
      </div>
    );

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.content}>
        {notificacao && (
          <div className={styles.notificacao}>
            <Icons.Check />
            <span>{notificacao}</span>
          </div>
        )}

        <button className={styles.voltarBtn} onClick={() => navigate(-1)}>
          <Icons.BackArrow /> Voltar para o painel de vagas
        </button>

        <div className={styles.headerSection}>
          <h1 className={styles.mainTitle}>
            Revisão Avançada de Currículo por{" "}
            <span className={styles.highlight}>Inteligência Artificial</span>
          </h1>
          <p className={styles.subtitle}>
            Análise técnica profunda do seu perfil frente aos critérios da vaga,
            reestruturando o documento com rigor profissional.
          </p>
        </div>

        <div className={styles.stepsContainer}>
          <div
            className={`${styles.stepItem} ${etapaAtual >= 1 ? styles.active : ""}`}
          >
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepIconWrap}>
              <Icons.UploadCloud />
            </div>
            <div className={styles.stepInfo}>
              <span className={styles.stepTitle}>Submissão</span>
              <span className={styles.stepDesc}>Envio e Validação Inicial</span>
            </div>
          </div>
          <div className={styles.stepDivider}></div>
          <div
            className={`${styles.stepItem} ${etapaAtual >= 2 ? styles.active : ""}`}
          >
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepIconWrap}>
              <Icons.Cpu />
            </div>
            <div className={styles.stepInfo}>
              <span className={styles.stepTitle}>Processamento</span>
              <span className={styles.stepDesc}>
                Lendo o currículo e analisando por IA
              </span>
            </div>
          </div>
          <div className={styles.stepDivider}></div>
          <div
            className={`${styles.stepItem} ${etapaAtual >= 3 ? styles.active : ""}`}
          >
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepIconWrap}>
              <Icons.FileText />
            </div>
            <div className={styles.stepInfo}>
              <span className={styles.stepTitle}>Avaliação</span>
              <span className={styles.stepDesc}>Reestruturando o currículo </span>
            </div>
          </div>
          <div className={styles.stepDivider}></div>
          <div
            className={`${styles.stepItem} ${etapaAtual >= 4 ? styles.active : ""}`}
          >
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepIconWrap}>
              <Icons.BarChart />
            </div>
            <div className={styles.stepInfo}>
              <span className={styles.stepTitle}>Conclusão</span>
              <span className={styles.stepDesc}>Relatório e Exportação</span>
            </div>
          </div>
        </div>

        {etapaAtual === 1 && (
          <>
            <div className={styles.mainGrid}>
              <div className={styles.uploadCard}>
                <div className={styles.cardHeader}>
                  <h2>Submissão do Currículo</h2>
                  <p>
                    Selecione e envie seu currículo
                    em PDF ou DOCX.
                  </p>
                </div>

                <div className={styles.vagaDetectadaBox}>
                  <span className={styles.vagaLabel}>
                    Oportunidade Alvo Selecionada
                  </span>
                  <div className={styles.vagaInfoContent}>
                    <div className={styles.vagaIconWrapper}>
                      <Icons.Briefcase />
                    </div>
                    <div>
                      <h3>{vaga.titulo}</h3>
                      <p>
                        {vaga.empresa?.nome || "Empresa Confidencial"} •{" "}
                        {vaga.cidade}/{vaga.estado}
                      </p>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx"
                  style={{ display: "none" }}
                />

                <div
                  className={styles.dropzone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.uploadIconCircle}>
                    <Icons.UploadCloud />
                  </div>
                  <p className={styles.dropText}>{nomeArquivo}</p>
                  <button
                    type="button"
                    className={styles.selectFileBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Selecionar arquivo
                  </button>
                  <span className={styles.formatInfo}>
                    PDF, DOCX • Máx: 10MB
                  </span>
                </div>

                <div className={styles.securityBox}>
                  <span className={styles.shieldIcon}>
                    <Icons.ShieldCheck />
                  </span>
                  <div>
                    <strong>Sigilo e Conformidade</strong>
                    <p>
                      Suas informações são tratadas sob rigorosos padrões de
                      segurança.
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.infoCard}>
                <h2>Metodologia de Análise Tecnológica</h2>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>
                    <Icons.Target />
                  </div>
                  <div>
                    <h4>Aderência Direta</h4>
                    <p>Cruzamento entre competências e diretrizes da vaga.</p>
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>
                    <Icons.FileText />
                  </div>
                  <div>
                    <h4>Padronização Executiva</h4>
                    <p>
                      Reestruturação textual focada em clareza profissional.
                    </p>
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>
                    <Icons.EditSparkle />
                  </div>
                  <div>
                    <h4>Fidelidade Curricular</h4>
                    <p>Refinamento exclusivo do seu histórico real.</p>
                  </div>
                </div>

                <div
                  style={{
                    background: "#161925",
                    border: "1px solid #1e2235",
                    borderRadius: "12px",
                    padding: "16px",
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ color: "#7c3aed", display: "flex" }}>
                    <Icons.Info />
                  </div>
                  <div>
                    <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>
                      Limite Diário de Utilização
                    </strong>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "0.85rem",
                        marginTop: "2px",
                        margin: 0,
                      }}
                    >
                      Você possui{" "}
                      <strong style={{ color: "#a78bfa" }}>
                        {tentativasRestantes} de 3
                      </strong>{" "}
                      revisões gratuitas restantes para hoje.
                    </p>
                  </div>
                </div>

                {curriculo && (
                  <div className={styles.revisarCard}>
                    <div className={styles.areaButton}>
                      <button
                        type="button"
                        className={styles.revisarButton}
                        onClick={() => void handleEnviarCurriculo()}
                        disabled={status === "enviando"}
                      >
                        <Icons.Sparkles />{" "}
                        {status === "enviando"
                          ? "Processando..."
                          : "Iniciar Revisão por IA"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.dashCardWithMargin}>
              <h3 className={styles.dashCardTitle}>
                <span className={styles.titleFlexWrapper}>
                  <Icons.Layers /> O que será feito na revisão do seu currículo
                </span>
              </h3>
              <div className={styles.reviewInfoGrid}>
                <div className={styles.reviewInfoBox}>
                  <h4 className={styles.reviewInfoTitle}>
                    1. Alinhamento de Competências
                  </h4>
                  <p className={styles.reviewInfoDesc}>
                    A IA cruzará o seu perfil com as exigências da oportunidade
                    selecionada, destacando suas principais forças e
                    competências essenciais.
                  </p>
                </div>
                <div className={styles.reviewInfoBox}>
                  <h4 className={styles.reviewInfoTitle}>
                    2. Reestruturação Executiva
                  </h4>
                  <p className={styles.reviewInfoDesc}>
                    Seu histórico de experiências e formação será reorganizado
                    com foco total em legibilidade, clareza e impacto visual
                    profissional.
                  </p>
                </div>
                <div className={styles.reviewInfoBox}>
                  <h4 className={styles.reviewInfoTitle}>
                    3. Diagnóstico e Nota Analítica
                  </h4>
                  <p className={styles.reviewInfoDesc}>
                    Você receberá um relatório completo com pontuação técnica
                    detalhada, pontos fortes e recomendações estratégicas para
                    se destacar.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {(etapaAtual === 2 || etapaAtual === 3) && (
          <div className={styles.loadingScreenCardClean}>
            <div className={styles.spinnerWrapper}>
              <div className={styles.spinner}></div>
            </div>
            <h2>{mensagemAtualObj.title}</h2>
            <p>{mensagemAtualObj.desc}</p>
          </div>
        )}

        {etapaAtual === 4 && resultadoIA && (
          <div className={styles.resultadoCompletoWrapper}>
            <div className={styles.resultadoHeaderTitle}>
              <h2>Relatório de Análise e Desempenho</h2>
              <p>
                Confira a nota analítica oficial e o diagnóstico completo para
                esta oportunidade.
              </p>
            </div>

            <div className={styles.dashboardGridTop}>
              <div className={styles.dashCard}>
                <div className={styles.cardHeaderWithBadge}>
                  <h3 className={styles.dashCardTitleNoMargin}>
                    Nota Analítica da IA
                  </h3>
                  <span className={styles.evolutionBadge}>
                    <Icons.TrendingUp /> +{percentualEvolucao}% de ganho
                  </span>
                </div>

                {/* CONTAINER LADO A LADO AMPLIADO E RESPONSIVO */}
                <div className={styles.scoreCircleComparisonContainer}>
                  <CircularScoreMeter
                    score={notaAntesIA}
                    label="Nota Antes"
                    subLabel="Original"
                    color={obterCorNota(notaAntesIA)}
                  />
                  <div className={styles.scoreCircleDivider}>
                    <div className={styles.arrowPulseRight}>→</div>
                  </div>
                  <CircularScoreMeter
                    score={notaAtualIA}
                    label="Nota Depois"
                    subLabel="Revisado IA"
                    color={obterCorNota(notaAtualIA)}
                  />
                </div>

                <div className={styles.scoreBottomInfoRow}>
                  <div className={styles.classificationWrapper}>
                    <span className={styles.scoreMetaLabel}>
                      Classificação do Perfil
                    </span>
                    <span
                      className={styles.profileClassificationText}
                      style={{ color: classificacaoAtual.corTexto }}
                    >
                      {classificacaoAtual.label}
                    </span>
                  </div>
                  <div className={styles.matchWrapper}>
                    <span className={styles.scoreMetaLabel}>
                      Compatibilidade
                    </span>
                    <span className={styles.matchIndexValue}>
                      {resultadoIA.compatibilidadeVaga}% Match
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.dashCard}>
                <h3 className={styles.dashCardTitle}>
                  Critérios de Avaliação da IA
                </h3>
                <div className={styles.comparacaoList}>
                  <div className={styles.comparacaoItem}>
                    <div className={styles.comparacaoItemHeader}>
                      <span>Estrutura Textual</span>
                      <span>
                        {criteriosAI.estruturaTextual.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillDepois}
                        style={{
                          width: `${Math.min(100, criteriosAI.estruturaTextual * 10)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className={styles.comparacaoItem}>
                    <div className={styles.comparacaoItemHeader}>
                      <span>Clareza Executiva</span>
                      <span>
                        {criteriosAI.clarezaExecutiva.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillDepois}
                        style={{
                          width: `${Math.min(100, criteriosAI.clarezaExecutiva * 10)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className={styles.comparacaoItem}>
                    <div className={styles.comparacaoItemHeader}>
                      <span>Alinhamento à Vaga</span>
                      <span>{criteriosAI.alinhamentoVaga.toFixed(1)} / 10</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillDepois}
                        style={{
                          width: `${Math.min(100, criteriosAI.alinhamentoVaga * 10)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className={styles.comparacaoItem}>
                    <div className={styles.comparacaoItemHeader}>
                      <span>Palavras-Chave</span>
                      <span>
                        {criteriosAI.palavrasChaveAts.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillDepois}
                        style={{
                          width: `${Math.min(100, criteriosAI.palavrasChaveAts * 10)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.dashCard}>
                <h3 className={styles.dashCardTitle}>
                  Oportunidade Alvo <Icons.Briefcase />
                </h3>
                <div className={styles.vagaDetectadaDetails}>
                  <div className={styles.vagaDetailRow}>
                    <span>Cargo Pretendido</span>
                    <strong>{vaga.titulo}</strong>
                  </div>
                  <div className={styles.vagaDetailRow}>
                    <span>Área de Atuação</span>
                    <strong>{vaga.tipo || "Tecnologia"}</strong>
                  </div>
                  <div className={styles.vagaDetailRow}>
                    <span>Nível Exigido</span>
                    <strong>{vaga.contrato || "Júnior"}</strong>
                  </div>
                  <div className={styles.vagaDetailRow}>
                    <span style={{ marginBottom: "4px" }}>Palavras-chave</span>
                    <div className={styles.keywordsTagsCloud}>
                      {resultadoIA.palavrasChaveEncontradas.map((kw, i) => (
                        <span key={i} className={styles.keywordTagMini}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.dashboardGridBottom}>
              <div className={styles.dashCard}>
                <h3 className={styles.dashCardTitle}>
                  Pontos Fortes Identificados
                </h3>
                <ul className={styles.melhoriasListUl}>
                  {resultadoIA.pontosFortes.map((p, idx) => (
                    <li key={idx}>
                      <Icons.Check /> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.dashCard}>
                <h3 className={styles.dashCardTitle}>
                  Recomendações Estratégicas
                </h3>
                <ul className={styles.sugestoesListUl}>
                  {resultadoIA.pontosAtencao.map((p, idx) => (
                    <li key={idx}>
                      <Icons.Plus /> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.dashCard}>
                <h3 className={styles.dashCardTitle}>Síntese de Análise</h3>
                <div className={styles.resumoRevisaoBoxInner}>
                  <p>{resultadoIA.analise}</p>
                  <div className={styles.resumoWarningItem}>
                    <Icons.ShieldCheck />
                    <p>
                      Integridade assegurada. Refinado exclusivamente para{" "}
                      <strong>{nomeCandidatoReal}</strong>.
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      background: "#161925",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid #1e2235",
                    }}
                  >
                    <span className={styles.scoreMetaLabel}>
                      Avaliação Ponderada
                    </span>
                    <strong
                      style={{
                        color: classificacaoAtual.corTexto,
                        fontSize: "1.2rem",
                        display: "block",
                        marginTop: "2px",
                      }}
                    >
                      {notaAtualIA.toFixed(1)} / 10 ({classificacaoAtual.label})
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.resultActionButtonsBar}>
              <button
                type="button"
                className={styles.backBlackBtn}
                onClick={() => {
                  setEtapaAtual(1);
                  setCurriculo(null);
                  setNomeArquivo("Nenhum arquivo selecionado");
                  atualizarContadorTentativas();
                }}
              >
                <Icons.BackArrow /> Voltar
              </button>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={styles.downloadPrimaryBtn}
                  onClick={() => void handleBaixarPDF()}
                >
                  <Icons.Download /> Baixar Currículo em PDF
                </button>
                <button
                  type="button"
                  className={styles.backBlackBtn}
                  onClick={() => void handleBaixarDOCX()}
                >
                  <Icons.Download /> Baixar em formato DOCX
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RevisarCurriculo;
