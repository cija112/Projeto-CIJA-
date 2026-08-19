import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/sideBar/sideBar";
import { supabase } from "../../../supabaseClient";
import styles from "./candidatarPadrao.module.css";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

interface Empresa {
  id_em: string;
  nome: string;
  avatarempresa_url: string | null;
}

interface Vaga {
  id_vag: string;
  titulo: string;
  descricao: string;
  carga_horaria: number | null;
  salario: number | null;
  data_publicada: string | null;
  cidade: string | null;
  estado: string | null;
  tipo: string | null;
  contrato: string | null;
  id_em?: string | null;
  empresa: Empresa | null;
}

interface Candidato {
  id_ja: string;
  nome_completo?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
}

interface Curriculo {
  id_ja: string;
  descricao: string | null;
  competencias: string | null;
  experiencias: unknown;
  curso: unknown;
  updated_at: string | null;
}

interface Notificacao {
  tipo: "sucesso" | "erro" | "info";
  mensagem: string;
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
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),

  Briefcase: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),

  User: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),

  FileText: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),

  Graduation: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
  ),

  Award: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13 18 22l-6-3-6 3 2.5-9" />
    </svg>
  ),

  Check: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),

  AlertCircle: () => (
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),

  Send: () => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),

  ShieldCheck: () => (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
};

const converterParaArray = (valor: unknown): unknown[] => {
  if (valor === null || valor === undefined) {
    return [];
  }

  if (Array.isArray(valor)) {
    return valor;
  }

  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) {
      return [];
    }

    try {
      const parsed = JSON.parse(texto);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (
        typeof parsed === "object" &&
        parsed !== null
      ) {
        return [parsed];
      }

      return [parsed];
    } catch {
      return [valor];
    }
  }

  if (typeof valor === "object") {
    return [valor];
  }

  return [valor];
};

const formatarTexto = (valor: unknown): string => {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  if (
    typeof valor === "string" ||
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {
    return String(valor);
  }

  return "";
};

const pegarCampo = (
  objeto: Record<string, unknown>,
  campos: string[]
): string => {
  for (const campo of campos) {
    const valor = objeto[campo];

    const texto = formatarTexto(valor).trim();

    if (texto) {
      return texto;
    }
  }

  return "";
};

const possuiConteudo = (valor: unknown): boolean => {
  if (
    valor === null ||
    valor === undefined
  ) {
    return false;
  }

  if (typeof valor === "string") {
    return valor.trim().length > 0;
  }

  if (Array.isArray(valor)) {
    return valor.length > 0;
  }

  if (typeof valor === "object") {
    return Object.keys(valor).length > 0;
  }

  return true;
};

const logarErroSupabase = (
  contexto: string,
  error: unknown
) => {
  console.error(`========== ${contexto} ==========`);

  if (error && typeof error === "object") {
    const erro = error as Record<string, unknown>;

    console.error("Objeto:", error);
    console.error("Código:", erro.code);
    console.error("Mensagem:", erro.message);
    console.error("Detalhes:", erro.details);
    console.error("Hint:", erro.hint);
  } else {
    console.error("Erro:", error);
  }

  console.error("================================");
};

interface ItemCurriculoProps {
  valor: unknown;
  tipo: "experiencia" | "curso";
}

const ItemCurriculo: React.FC<ItemCurriculoProps> = ({
  valor,
  tipo,
}) => {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  if (
    typeof valor === "string" ||
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {
    return (
      <div className={styles.curriculoItem}>
        <p className={styles.curriculoItemDescricao}>
          {String(valor)}
        </p>
      </div>
    );
  }

  if (
    typeof valor === "object" &&
    !Array.isArray(valor)
  ) {
    const objeto =
      valor as Record<string, unknown>;

    const titulo =
      tipo === "experiencia"
        ? pegarCampo(objeto, [
            "cargo",
            "titulo",
            "nome",
            "função",
            "funcao",
            "profissao",
            "profissão",
          ])
        : pegarCampo(objeto, [
            "curso",
            "titulo",
            "nome",
            "nome_curso",
            "nomeCurso",
          ]);

    const empresaOuInstituicao =
      tipo === "experiencia"
        ? pegarCampo(objeto, [
            "empresa",
            "companhia",
            "organizacao",
            "organização",
          ])
        : pegarCampo(objeto, [
            "instituicao",
            "instituição",
            "escola",
            "organizacao",
            "organização",
          ]);

    const inicio = pegarCampo(objeto, [
      "inicio",
      "início",
      "data_inicio",
      "dataInicio",
      "ano_inicio",
      "anoInicio",
    ]);

    const fim = pegarCampo(objeto, [
      "fim",
      "data_fim",
      "dataFim",
      "ano_fim",
      "anoFim",
    ]);

    const descricao = pegarCampo(objeto, [
      "descricao",
      "descrição",
      "description",
      "detalhes",
      "detalhe",
    ]);

    const periodo = pegarCampo(objeto, [
      "periodo",
      "período",
    ]);

    return (
      <div className={styles.curriculoItem}>
        {titulo && (
          <h4>
            {titulo}
          </h4>
        )}

        {empresaOuInstituicao && (
          <span className={styles.curriculoItemEmpresa}>
            {empresaOuInstituicao}
          </span>
        )}

        {(inicio || fim || periodo) && (
          <span className={styles.curriculoItemPeriodo}>
            {periodo
              ? periodo
              : `${inicio || "Início não informado"} — ${
                  fim || "Atual"
                }`}
          </span>
        )}

        {descricao && (
          <p className={styles.curriculoItemDescricao}>
            {descricao}
          </p>
        )}

        {!titulo &&
          !empresaOuInstituicao &&
          !inicio &&
          !fim &&
          !periodo &&
          !descricao && (
            <p className={styles.curriculoItemDescricao}>
              Informações cadastradas no currículo.
            </p>
          )}
      </div>
    );
  }

  return null;
};

const CandidatarPadrao: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  useDocumentTitle("CIJA - Candidatura");

  const [vaga, setVaga] =
    useState<Vaga | null>(null);

  const [candidato, setCandidato] =
    useState<Candidato | null>(null);

  const [curriculo, setCurriculo] =
    useState<Curriculo | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [enviando, setEnviando] =
    useState(false);

  const [
    candidaturaRealizada,
    setCandidaturaRealizada,
  ] = useState(false);

  const [notificacao, setNotificacao] =
    useState<Notificacao | null>(null);

  const mostrarNotificacao = (
    mensagem: string,
    tipo:
      | "sucesso"
      | "erro"
      | "info" = "info"
  ) => {
    setNotificacao({
      mensagem,
      tipo,
    });

    window.setTimeout(() => {
      setNotificacao(null);
    }, 5000);
  };

  useEffect(() => {
    void inicializar();
  }, [id]);

  const inicializar = async () => {
    setLoading(true);

    try {
      if (!id) {
        mostrarNotificacao(
          "Não foi possível identificar a vaga.",
          "erro"
        );

        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        logarErroSupabase(
          "ERRO AO VERIFICAR AUTENTICAÇÃO",
          authError
        );

        mostrarNotificacao(
          "Não foi possível verificar sua sessão.",
          "erro"
        );

        return;
      }

      if (!user) {
        mostrarNotificacao(
          "Você precisa estar autenticado para se candidatar.",
          "erro"
        );

        return;
      }

      const {
        data: candidatoData,
        error: candidatoError,
      } = await supabase
        .from("jovem_aprendiz")
        .select("*")
        .eq("id_ja", user.id)
        .maybeSingle();

      if (candidatoError) {
        logarErroSupabase(
          "ERRO AO BUSCAR CANDIDATO",
          candidatoError
        );

        mostrarNotificacao(
          "Não foi possível carregar seus dados de candidato.",
          "erro"
        );

        return;
      }

      if (!candidatoData) {
        mostrarNotificacao(
          "Seu perfil de candidato não foi encontrado.",
          "erro"
        );

        return;
      }

      setCandidato(candidatoData);

      const {
        data: curriculoData,
        error: curriculoError,
      } = await supabase
        .from("curriculo_ja")
        .select(
          `
            id_ja,
            descricao,
            competencias,
            experiencias,
            curso,
            updated_at
          `
        )
        .eq("id_ja", candidatoData.id_ja)
        .maybeSingle();

      if (curriculoError) {
        logarErroSupabase(
          "ERRO AO BUSCAR CURRÍCULO",
          curriculoError
        );

        mostrarNotificacao(
          "Não foi possível carregar seu currículo.",
          "erro"
        );

        return;
      }

      if (!curriculoData) {
        setCurriculo(null);
      } else {
        setCurriculo(curriculoData);
      }

      /* ======================================================
         BUSCAR VAGA
      ====================================================== */

      const {
        data: vagaData,
        error: vagaError,
      } = await supabase
        .from("vaga")
        .select("*")
        .eq("id_vag", id)
        .maybeSingle();

      if (vagaError) {
        logarErroSupabase(
          "ERRO AO BUSCAR VAGA",
          vagaError
        );

        mostrarNotificacao(
          "A vaga não pôde ser carregada.",
          "erro"
        );

        return;
      }

      if (!vagaData) {
        mostrarNotificacao(
          "A vaga não foi encontrada ou está indisponível.",
          "erro"
        );

        return;
      }

      /* ======================================================
         BUSCAR EMPRESA
      ====================================================== */

      let empresaCompleta:
        | Empresa
        | null = null;

      if (vagaData.id_em) {
        const {
          data: empresaData,
          error: empresaError,
        } = await supabase
          .from("empresa")
          .select(
            "id_em, nome, avatarempresa_url"
          )
          .eq("id_em", vagaData.id_em)
          .maybeSingle();

        if (empresaError) {
          logarErroSupabase(
            "ERRO AO BUSCAR EMPRESA",
            empresaError
          );
        }

        if (empresaData) {
          empresaCompleta =
            empresaData;
        }
      }

      setVaga({
        ...vagaData,
        empresa: empresaCompleta,
      });

      /* ======================================================
         VERIFICAR CANDIDATURA EXISTENTE

         IMPORTANTE:
         Não usamos maybeSingle() aqui.

         Se houver mais de uma candidatura antiga
         para a mesma vaga/candidato, maybeSingle()
         retorna erro.

         limit(1) apenas verifica se existe pelo
         menos uma candidatura.
      ====================================================== */

      const {
        data: candidaturasExistentes,
        error: candidaturaError,
      } = await supabase
        .from("candidaturas")
        .select("id_candidatura, data_candidatura")
        .eq("id_vaga", id)
        .eq(
          "id_candidato",
          candidatoData.id_ja
        )
        .limit(1);

      if (candidaturaError) {
        logarErroSupabase(
          "ERRO AO VERIFICAR CANDIDATURA NA INICIALIZAÇÃO",
          candidaturaError
        );

        /*
         * Não interrompemos o carregamento da página.
         * O usuário ainda poderá visualizar a vaga.
         */
      }

      if (
        candidaturasExistentes &&
        candidaturasExistentes.length > 0
      ) {
        setCandidaturaRealizada(true);
      }
    } catch (error) {
      console.error(
        "========== ERRO INESPERADO AO INICIALIZAR =========="
      );
      console.error(error);

      if (error instanceof Error) {
        console.error("Mensagem:", error.message);
        console.error("Stack:", error.stack);
      }

      console.error(
        "====================================================="
      );

      mostrarNotificacao(
        "Ocorreu um erro ao carregar a página.",
        "erro"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     REALIZAR CANDIDATURA
  ========================================================== */

  const handleCandidatar = async () => {
    if (enviando) {
      return;
    }

    if (!vaga) {
      mostrarNotificacao(
        "A vaga não foi encontrada.",
        "erro"
      );

      return;
    }

    if (!candidato) {
      mostrarNotificacao(
        "Não foi possível identificar seu perfil.",
        "erro"
      );

      return;
    }

    if (!curriculo) {
      mostrarNotificacao(
        "Você precisa possuir um currículo cadastrado antes de se candidatar.",
        "erro"
      );

      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      logarErroSupabase(
        "ERRO AO VERIFICAR SESSÃO ANTES DA CANDIDATURA",
        authError
      );

      mostrarNotificacao(
        "Não foi possível verificar sua sessão.",
        "erro"
      );

      return;
    }

    if (!user) {
      mostrarNotificacao(
        "Sua sessão expirou. Faça login novamente.",
        "erro"
      );

      return;
    }

    setEnviando(true);

    try {
      const {
        data: candidaturasExistentes,
        error: verificacaoError,
      } = await supabase
        .from("candidaturas")
        .select("id_candidatura")
        .eq("id_vaga", vaga.id_vag)
        .eq(
          "id_candidato",
          candidato.id_ja
        )
        .limit(1);

      if (verificacaoError) {
        logarErroSupabase(
          "ERRO AO VERIFICAR CANDIDATURA",
          verificacaoError
        );
        mostrarNotificacao(
          "Não foi possível verificar sua candidatura. Tente novamente.",
          "erro"
        );

        return;
      }
      if (
        candidaturasExistentes &&
        candidaturasExistentes.length > 0
      ) {
        setCandidaturaRealizada(true);

        mostrarNotificacao(
          "Você já possui uma candidatura para esta vaga.",
          "info"
        );

        return;
      }

      const {
        data: candidatura,
        error: candidaturaError,
      } = await supabase
        .from("candidaturas")
        .insert({
          id_vaga: vaga.id_vag,
          id_candidato: candidato.id_ja,
        })
        .select(
          `
            id_candidatura,
            id_vaga,
            id_candidato,
            data_candidatura
          `
        )
        .single();

      if (candidaturaError) {
        logarErroSupabase(
          "ERRO AO CRIAR CANDIDATURA",
          candidaturaError
        );

        if (
          candidaturaError.code === "23505"
        ) {
          setCandidaturaRealizada(true);

          mostrarNotificacao(
            "Você já possui uma candidatura para esta vaga.",
            "info"
          );

          return;
        }

        const mensagemBanco =
          candidaturaError.message ||
          candidaturaError.details ||
          "Não foi possível registrar sua candidatura.";

        mostrarNotificacao(
          mensagemBanco,
          "erro"
        );

        return;
      }

      console.log(
        "========== CANDIDATURA CRIADA =========="
      );
      console.log(
        "Candidatura:",
        candidatura
      );
      console.log(
        "========================================"
      );

      setCandidaturaRealizada(true);

      mostrarNotificacao(
        "Candidatura realizada com sucesso!",
        "sucesso"
      );
    } catch (error) {

      console.error(
        "========== ERRO INESPERADO AO REALIZAR CANDIDATURA =========="
      );

      console.error("Erro:", error);

      if (error instanceof Error) {
        console.error(
          "Mensagem:",
          error.message
        );

        console.error(
          "Stack:",
          error.stack
        );
      }

      console.error(
        "============================================================"
      );

      mostrarNotificacao(
        "Ocorreu um erro inesperado ao realizar sua candidatura.",
        "erro"
      );
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Sidebar />

        <main className={styles.contentLoading}>
          <div className={styles.spinner} />

          <p>
            Carregando informações da vaga e do seu
            perfil...
          </p>
        </main>
      </div>
    );
  }

  if (!vaga) {
    return (
      <div className={styles.container}>
        <Sidebar />

        <main className={styles.contentLoading}>
          <div className={styles.errorIcon}>
            <Icons.AlertCircle />
          </div>

          <h2>
            Vaga não encontrada
          </h2>

          <p>
            A vaga selecionada não foi encontrada
            ou não está mais disponível.
          </p>

          <button
            className={styles.voltarBtn}
            onClick={() => navigate(-1)}
          >
            <Icons.BackArrow />

            Voltar
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Sidebar />

      <main className={styles.content}>
        {/* ====================================================
            NOTIFICAÇÃO
        ==================================================== */}

        {notificacao && (
          <div
            className={`${styles.notificacao} ${
              notificacao.tipo === "erro"
                ? styles.notificacaoErro
                : notificacao.tipo === "sucesso"
                ? styles.notificacaoSucesso
                : styles.notificacaoInfo
            }`}
          >
            {notificacao.tipo === "erro" ? (
              <Icons.AlertCircle />
            ) : (
              <Icons.Check />
            )}

            <span>
              {notificacao.mensagem}
            </span>
          </div>
        )}

        {/* ====================================================
            VOLTAR
        ==================================================== */}

        <button
          className={styles.voltarBtn}
          onClick={() => navigate(-1)}
        >
          <Icons.BackArrow />

          Voltar para vagas
        </button>

        {/* ====================================================
            CABEÇALHO
        ==================================================== */}

        <section className={styles.headerSection}>
          <span className={styles.overline}>
            CANDIDATURA
          </span>

          <h1 className={styles.mainTitle}>
            Candidate-se para esta{" "}
            <span>oportunidade</span>
          </h1>

          <p className={styles.subtitle}>
            Confira os detalhes da vaga e seu currículo
            antes de enviar sua candidatura.
          </p>
        </section>

        {/* ====================================================
            GRID PRINCIPAL
        ==================================================== */}

        <div className={styles.mainGrid}>
          {/* ==================================================
              CARD DA VAGA
          ================================================== */}

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconCircle}>
                <Icons.Briefcase />
              </div>

              <div className={styles.cardHeaderText}>
                <span className={styles.cardLabel}>
                  OPORTUNIDADE
                </span>

                <h2>
                  {vaga.titulo}
                </h2>
              </div>
            </div>

            <div className={styles.vagaInfo}>
              <div className={styles.infoItem}>
                <span>
                  Empresa
                </span>

                <strong>
                  {vaga.empresa?.nome ||
                    "Empresa não informada"}
                </strong>
              </div>

              <div className={styles.infoItem}>
                <span>
                  Localização
                </span>

                <strong>
                  {vaga.cidade ||
                    "Cidade não informada"}

                  {vaga.estado
                    ? ` - ${vaga.estado}`
                    : ""}
                </strong>
              </div>

              <div className={styles.infoItem}>
                <span>
                  Contrato
                </span>

                <strong>
                  {vaga.contrato ||
                    "Não informado"}
                </strong>
              </div>

              <div className={styles.infoItem}>
                <span>
                  Tipo
                </span>

                <strong>
                  {vaga.tipo ||
                    "Não informado"}
                </strong>
              </div>

              <div className={styles.infoItem}>
                <span>
                  Carga horária
                </span>

                <strong>
                  {vaga.carga_horaria
                    ? `${vaga.carga_horaria} horas`
                    : "Não informado"}
                </strong>
              </div>

              <div className={styles.infoItem}>
                <span>
                  Salário
                </span>

                <strong className={styles.salary}>
                  {vaga.salario
                    ? `R$ ${Number(
                        vaga.salario
                      ).toLocaleString(
                        "pt-BR",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`
                    : "A combinar"}
                </strong>
              </div>
            </div>

            <div className={styles.descricao}>
              <div className={styles.sectionTitle}>
                <span />

                <h3>
                  Sobre a oportunidade
                </h3>
              </div>

              <p>
                {vaga.descricao ||
                  "Descrição não informada."}
              </p>
            </div>
          </div>

          {/* ==================================================
              CARD DO CANDIDATO
          ================================================== */}

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconCircle}>
                <Icons.User />
              </div>

              <div className={styles.cardHeaderText}>
                <span className={styles.cardLabel}>
                  SEU PERFIL
                </span>

                <h2>
                  Dados da candidatura
                </h2>
              </div>
            </div>

            {/* ==================================================
                CANDIDATO
            ================================================== */}

            <div className={styles.candidatoBox}>
              <div className={styles.candidatoIcon}>
                <Icons.User />
              </div>

              <div className={styles.candidatoInfo}>
                <span>
                  Candidato
                </span>

                <strong>
                  {candidato?.nome_completo ||
                    candidato?.nome ||
                    "Candidato"}
                </strong>

                {candidato?.email && (
                  <small>
                    {candidato.email}
                  </small>
                )}
              </div>
            </div>

            {/* ==================================================
                CURRÍCULO
            ================================================== */}

            {curriculo ? (
              <div className={styles.curriculoBox}>
                <div className={styles.curriculoHeader}>
                  <div className={styles.curriculoIcon}>
                    <Icons.FileText />
                  </div>

                  <div>
                    <span className={styles.curriculoLabel}>
                      CURRÍCULO CADASTRADO
                    </span>

                    <h3>
                      Seu currículo
                    </h3>
                  </div>
                </div>

                {/* =================================================
                    SOBRE VOCÊ
                ================================================= */}

                {possuiConteudo(
                  curriculo.descricao
                ) && (
                  <div className={styles.curriculoSection}>
                    <div
                      className={
                        styles.curriculoSectionTitle
                      }
                    >
                      <Icons.FileText />

                      <span>
                        Sobre você
                      </span>
                    </div>

                    <p
                      className={
                        styles.curriculoTexto
                      }
                    >
                      {curriculo.descricao}
                    </p>
                  </div>
                )}

                {/* =================================================
                    COMPETÊNCIAS
                ================================================= */}

                {possuiConteudo(
                  curriculo.competencias
                ) && (
                  <div className={styles.curriculoSection}>
                    <div
                      className={
                        styles.curriculoSectionTitle
                      }
                    >
                      <Icons.Award />

                      <span>
                        Competências
                      </span>
                    </div>

                    <p
                      className={
                        styles.curriculoTexto
                      }
                    >
                      {curriculo.competencias}
                    </p>
                  </div>
                )}

                {/* =================================================
                    EXPERIÊNCIAS
                ================================================= */}

                {possuiConteudo(
                  curriculo.experiencias
                ) && (
                  <div className={styles.curriculoSection}>
                    <div
                      className={
                        styles.curriculoSectionTitle
                      }
                    >
                      <Icons.Briefcase />

                      <span>
                        Experiências
                      </span>
                    </div>

                    <div
                      className={
                        styles.curriculoLista
                      }
                    >
                      {converterParaArray(
                        curriculo.experiencias
                      ).map(
                        (
                          experiencia,
                          index
                        ) => (
                          <ItemCurriculo
                            key={`experiencia-${index}`}
                            valor={
                              experiencia
                            }
                            tipo="experiencia"
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================
                    CURSOS
                ================================================= */}

                {possuiConteudo(
                  curriculo.curso
                ) && (
                  <div className={styles.curriculoSection}>
                    <div
                      className={
                        styles.curriculoSectionTitle
                      }
                    >
                      <Icons.Graduation />

                      <span>
                        Cursos
                      </span>
                    </div>

                    <div
                      className={
                        styles.curriculoLista
                      }
                    >
                      {converterParaArray(
                        curriculo.curso
                      ).map(
                        (
                          curso,
                          index
                        ) => (
                          <ItemCurriculo
                            key={`curso-${index}`}
                            valor={curso}
                            tipo="curso"
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================
                    ATUALIZAÇÃO
                ================================================= */}

                {curriculo.updated_at && (
                  <div
                    className={
                      styles.curriculoAtualizacao
                    }
                  >
                    Currículo atualizado em{" "}
                    {new Date(
                      curriculo.updated_at
                    ).toLocaleDateString(
                      "pt-BR"
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.semCurriculo}>
                <div
                  className={
                    styles.semCurriculoIcon
                  }
                >
                  <Icons.AlertCircle />
                </div>

                <div>
                  <strong>
                    Currículo não encontrado
                  </strong>

                  <p>
                    Você precisa cadastrar seu currículo
                    antes de se candidatar a uma vaga.
                  </p>
                </div>
              </div>
            )}

            {/* ==================================================
                SEGURANÇA
            ================================================== */}

            <div className={styles.securityBox}>
              <div className={styles.securityIcon}>
                <Icons.ShieldCheck />
              </div>

              <div>
                <strong>
                  Seus dados estão protegidos
                </strong>

                <p>
                  Seu currículo será utilizado
                  exclusivamente para o processo
                  seletivo desta candidatura.
                </p>
              </div>
            </div>

            {/* ==================================================
                BOTÃO
            ================================================== */}

            {candidaturaRealizada ? (
              <div
                className={
                  styles.sucessoCandidatura
                }
              >
                <div
                  className={
                    styles.sucessoIcon
                  }
                >
                  <Icons.Check />
                </div>

                <div>
                  <strong>
                    Candidatura realizada!
                  </strong>

                  <p>
                    Você já está participando
                    do processo seletivo desta
                    vaga.
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={
                  styles.candidatarButton
                }
                onClick={() =>
                  void handleCandidatar()
                }
                disabled={
                  enviando || !curriculo
                }
              >
                {enviando ? (
                  <>
                    <span
                      className={
                        styles.buttonSpinner
                      }
                    />

                    Enviando candidatura...
                  </>
                ) : (
                  <>
                    <Icons.Send />

                    Enviar candidatura
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ====================================================
            PROCESSO
        ==================================================== */}

        <section className={styles.infoSection}>
          <div
            className={
              styles.infoSectionHeader
            }
          >
            <span>
              PROCESSO DE CANDIDATURA
            </span>

            <h2>
              É simples se candidatar
            </h2>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>
                01
              </div>

              <div>
                <h3>
                  Confira seu currículo
                </h3>

                <p>
                  Verifique se suas informações
                  profissionais estão atualizadas.
                </p>
              </div>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>
                02
              </div>

              <div>
                <h3>
                  Envie sua candidatura
                </h3>

                <p>
                  Clique no botão para registrar
                  sua candidatura nesta vaga.
                </p>
              </div>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>
                03
              </div>

              <div>
                <h3>
                  Aguarde o processo
                </h3>

                <p>
                  Seu perfil ficará disponível
                  para avaliação da empresa.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CandidatarPadrao;