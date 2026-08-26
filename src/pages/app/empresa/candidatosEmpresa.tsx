import React, { useEffect, useState } from "react";
import styles from "./candidatosEmpresa.module.css";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { supabase } from "../../../supabaseClient";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  FileText,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Check,
  X,
  MessageSquare,
  Building,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

interface Vaga {
  id_vag: string;
  titulo: string;
  id_em: string;
}

interface JovemAprendiz {
  id_ja: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  avatar_url?: string | null;
}

interface Curriculo {
  id_ja: string;
  descricao?: string | null;
  competencias?: string | null;
  experiencias?: unknown;
  curso?: unknown;
}

interface CandidaturaBanco {
  id_candidatura: string;
  id_vaga: string;
  id_candidato: string;
  data_candidatura: string;
  status_aprovacao: string | null;
}

interface PerguntaPreEntrevista {
  id: string;
  form_id: string;
  question_text: string;
  type: string;
  options?: string[];
  created_at?: string;
}

interface FormularioPreEntrevista {
  id: string;
  id_em: string;
  title: string;
  description: string;
  created_at: string;
  questions: PerguntaPreEntrevista[];
}

interface FormResponse {
  id: string;
  created_at: string;
  form_id: string;
  user_id: string;
  answers: Record<string, any>;
}

interface Candidatura {
  id_candidatura: string;
  id_vag: string;
  id_candidato: string;
  data_candidatura: string;
  status_aprovacao: string | null;

  vaga: {
    titulo: string;
    id_em: string;
  };

  curriculo: {
    nome: string;
    telefone: string;
    endereco: string;
    email: string;
    descricao: string;
    competencias: string;
    experiencias: string;
    curso: string;
    instituicao?: string;
    periodo?: string;
  };

  preEntrevistas: {
    formulario: FormularioPreEntrevista;
    resposta: FormResponse;
  }[];
}

interface Formulario {
  id: string;
  created_at?: string;
}

interface ToastMessage {
  id: number;
  type: "success" | "error";
  message: string;
}

export const CandidatosEmpresa: React.FC = () => {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [candidaturaSelecionada, setCandidaturaSelecionada] =
    useState<Candidatura | null>(null);

  // Estados de Filtro e Paginação
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pendentes" | "aceitos" | "rejeitados"
  >("todos");
  const [termoBusca, setTermoBusca] = useState("");
  const [vagaFiltro, setVagaFiltro] = useState("todas");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 2;

  // Sistema de Notificações (Toasts)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const navigate = useNavigate();
  useDocumentTitle("CIJA - Candidatos às suas Vagas");

  useEffect(() => {
    buscarCandidatos();
  }, []);

  function formatarChave(chave: string): string {
    const nomes: Record<string, string> = {
      curso: "Curso",
      instituicao: "Instituição",
      inicio: "Início",
      fim: "Fim",
      empresa: "Empresa",
      cargo: "Cargo",
      funcao: "Função",
      periodo: "Período",
      atividades: "Atividades",
      descricao: "Descrição",
      titulo: "Título",
      local: "Local",
    };
    return (
      nomes[chave] ||
      chave.replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase())
    );
  }

  function tentarParseJson(valor: unknown): unknown {
    if (typeof valor !== "string") return valor;
    const texto = valor.trim();
    if (!texto) return "";
    try {
      return JSON.parse(texto);
    } catch {
      return valor;
    }
  }

  function jsonParaTexto(valor: unknown): string {
    if (valor === null || valor === undefined) return "";
    const valorProcessado = tentarParseJson(valor);
    if (valorProcessado !== valor) return jsonParaTexto(valorProcessado);
    if (typeof valorProcessado === "string") return valorProcessado;
    if (
      typeof valorProcessado === "number" ||
      typeof valorProcessado === "boolean"
    )
      return String(valorProcessado);
    if (Array.isArray(valorProcessado)) {
      return valorProcessado
        .map((item) => jsonParaTexto(item))
        .filter((item) => item.trim() !== "")
        .join("\n\n");
    }
    if (typeof valorProcessado === "object" && valorProcessado !== null) {
      const objeto = valorProcessado as Record<string, unknown>;
      return Object.entries(objeto)
        .map(([chave, valorCampo]) => {
          const texto = jsonParaTexto(valorCampo);
          if (!texto) return "";
          return `${formatarChave(chave)}: ${texto}`;
        })
        .filter((item) => item.trim() !== "")
        .join("\n");
    }
    return "";
  }

  function extrairDadosCurso(valor: unknown) {
    let dados = tentarParseJson(valor);
    if (Array.isArray(dados) && dados.length > 0) dados = dados[0];
    if (typeof dados === "object" && dados !== null) {
      const obj = dados as Record<string, unknown>;
      const cursoStr = String(obj.curso || obj.titulo || "Informática");
      const instStr = String(obj.instituicao || obj.local || "Bento Quirino");
      const inicio = obj.inicio || "2024";
      const fim = obj.fim || "2026";
      const periodoStr = `${inicio} - ${fim}`;
      return { curso: cursoStr, instituicao: instStr, periodo: periodoStr };
    }
    return {
      curso: "Informática",
      instituicao: "Bento Quirino",
      periodo: "2024 - 2026",
    };
  }

  function formatarRespostaPreEntrevista(resposta: any): string {
    if (resposta === null || resposta === undefined) return "Não respondido";
    if (Array.isArray(resposta)) {
      if (resposta.length === 0) return "Não respondido";
      return resposta.map((item) => String(item)).join(", ");
    }
    if (typeof resposta === "object") return jsonParaTexto(resposta);
    return String(resposta);
  }

  function obterIniciais(nome: string): string {
    if (!nome) return "JA";
    const partes = nome.trim().split(" ");
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  }

  async function buscarCandidatos() {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setCandidaturas([]);
        return;
      }

      const { data: vagasData, error: vagasError } = await supabase
        .from("vaga")
        .select("id_vag, titulo, id_em")
        .eq("id_em", user.id);

      if (vagasError) throw vagasError;
      if (!vagasData || vagasData.length === 0) {
        setCandidaturas([]);
        return;
      }

      const vagas = vagasData as Vaga[];
      const idsVagas = vagas.map((vaga) => vaga.id_vag);

      const { data: candidaturasData, error: candidaturasError } =
        await supabase
          .from("candidaturas")
          .select(
            "id_candidatura, id_vaga, id_candidato, data_candidatura, status_aprovacao",
          )
          .in("id_vaga", idsVagas)
          .order("data_candidatura", { ascending: false });

      if (candidaturasError) throw candidaturasError;
      if (!candidaturasData || candidaturasData.length === 0) {
        setCandidaturas([]);
        return;
      }

      const candidaturas = candidaturasData as CandidaturaBanco[];
      const idsCandidatos: string[] = [];
      candidaturas.forEach((c) => {
        if (c.id_candidato && idsCandidatos.indexOf(c.id_candidato) === -1) {
          idsCandidatos.push(c.id_candidato);
        }
      });

      const { data: jovensData, error: jovensError } = await supabase
        .from("jovem_aprendiz")
        .select("id_ja, nome, email, telefone, endereco, avatar_url")
        .in("id_ja", idsCandidatos);

      if (jovensError) throw jovensError;

      const { data: curriculosData, error: curriculosError } = await supabase
        .from("curriculo_ja")
        .select("id_ja, descricao, competencias, experiencias, curso")
        .in("id_ja", idsCandidatos);

      if (curriculosError) throw curriculosError;

      const { data: invitesData, error: invitesError } = await supabase
        .from("form_invites")
        .select("id, created_at, form_id, id_em, id_ja, status")
        .eq("id_em", user.id)
        .in("id_ja", idsCandidatos);

      if (invitesError) throw invitesError;

      const formIds: string[] = [];
      (invitesData || []).forEach((inv) => {
        if (inv.form_id && formIds.indexOf(inv.form_id) === -1)
          formIds.push(inv.form_id);
      });

      let formsData: any[] = [];
      if (formIds.length > 0) {
        const { data } = await supabase
          .from("forms")
          .select("id, id_em, created_at, title, description")
          .in("id", formIds);
        formsData = data || [];
      }

      let questionsData: PerguntaPreEntrevista[] = [];
      if (formIds.length > 0) {
        const { data } = await supabase
          .from("form_questions")
          .select("id, form_id, question_text, type, options, created_at")
          .in("form_id", formIds)
          .order("created_at", { ascending: true });
        questionsData = (data || []).map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        }));
      }

      const { data: responsesData } = await supabase
        .from("form_responses")
        .select("id, created_at, form_id, user_id, answers")
        .in("user_id", idsCandidatos);

      const listaFormatada: Candidatura[] = candidaturas.map((candidatura) => {
        const vaga = vagas.find((item) => item.id_vag === candidatura.id_vaga);
        const jovem = (jovensData || []).find(
          (item) => item.id_ja === candidatura.id_candidato,
        ) as JovemAprendiz | undefined;
        const curriculo = (curriculosData || []).find(
          (item) => item.id_ja === candidatura.id_candidato,
        ) as Curriculo | undefined;

        const infoCurso = extrairDadosCurso(curriculo?.curso);
        const experienciasFormatadas = jsonParaTexto(curriculo?.experiencias);

        const preEntrevistas: {
          formulario: FormularioPreEntrevista;
          resposta: FormResponse;
        }[] = [];
        const invitesDoCandidato = (invitesData || []).filter(
          (inv) => inv.id_ja === candidatura.id_candidato,
        );

        invitesDoCandidato.forEach((invite) => {
          const form = formsData.find((item) => item.id === invite.form_id);
          if (!form) return;
          const response = (responsesData || []).find(
            (item) =>
              item.form_id === invite.form_id &&
              item.user_id === candidatura.id_candidato,
          ) as FormResponse | undefined;
          if (!response) return;

          preEntrevistas.push({
            formulario: {
              id: form.id,
              id_em: form.id_em,
              title: form.title || "Pré-entrevista",
              description: form.description || "",
              created_at: form.created_at,
              questions: questionsData.filter((q) => q.form_id === form.id),
            },
            resposta: response,
          });
        });

        return {
          id_candidatura: candidatura.id_candidatura,
          id_vag: candidatura.id_vaga,
          id_candidato: candidatura.id_candidato,
          data_candidatura: candidatura.data_candidatura,
          status_aprovacao: candidatura.status_aprovacao,
          vaga: {
            titulo: vaga?.titulo || "Vaga não encontrada",
            id_em: vaga?.id_em || user.id,
          },
          curriculo: {
            nome: jovem?.nome || "Jovem Aprendiz",
            telefone: jovem?.telefone || "Não informado",
            endereco: jovem?.endereco || "Não informado",
            email: jovem?.email || "Não informado",
            descricao: curriculo?.descricao || "",
            competencias: curriculo?.competencias || "",
            experiencias: experienciasFormatadas,
            curso: infoCurso.curso,
            instituicao: infoCurso.instituicao,
            periodo: infoCurso.periodo,
          },
          preEntrevistas,
        };
      });

      setCandidaturas(listaFormatada);
    } catch (error: any) {
      console.error("Erro ao buscar candidatos:", error);
      addToast(
        "error",
        "Não foi possível carregar a lista de candidatos. Tente novamente mais tarde.",
      );
      setCandidaturas([]);
    } finally {
      setLoading(false);
    }
  }

  async function buscarFormulario(): Promise<string> {
    const { data, error } = await supabase
      .from("forms")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Nenhum formulário encontrado.");
    return (data as Formulario).id;
  }

  async function aceitarCandidato(candidatura: Candidatura) {
    if (
      !window.confirm(
        `Deseja aceitar ${candidatura.curriculo.nome} para a vaga "${candidatura.vaga.titulo}"?`,
      )
    )
      return;

    try {
      setProcessandoId(candidatura.id_candidatura);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        addToast(
          "error",
          "Sua sessão expirou. Por favor, faça login novamente.",
        );
        return;
      }

      const formId = await buscarFormulario();
      const { error: updateError } = await supabase
        .from("candidaturas")
        .update({ status_aprovacao: "aceito" })
        .eq("id_candidatura", candidatura.id_candidatura);
      if (updateError) throw updateError;

      const { data: conviteExistente } = await supabase
        .from("form_invites")
        .select("id")
        .eq("form_id", formId)
        .eq("id_em", user.id)
        .eq("id_ja", candidatura.id_candidato)
        .limit(1)
        .maybeSingle();

      if (!conviteExistente) {
        const { error: insertError } = await supabase
          .from("form_invites")
          .insert({
            form_id: formId,
            id_em: user.id,
            id_ja: candidatura.id_candidato,
            status: "pendente",
          });
        if (insertError) throw insertError;
      }

      setCandidaturas((prev) =>
        prev.map((item) =>
          item.id_candidatura === candidatura.id_candidatura
            ? { ...item, status_aprovacao: "aceito" }
            : item,
        ),
      );
      addToast(
        "success",
        `Candidato ${candidatura.curriculo.nome} aceito com sucesso!`,
      );
    } catch (error: any) {
      console.error("Erro ao aceitar candidato:", error);
      addToast(
        "error",
        "Erro ao aceitar o candidato. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setProcessandoId(null);
    }
  }

  async function rejeitarCandidato(candidatura: Candidatura) {
    if (
      !window.confirm(
        `Deseja realmente rejeitar a candidatura de ${candidatura.curriculo.nome}?`,
      )
    )
      return;

    try {
      setProcessandoId(candidatura.id_candidatura);
      const { error } = await supabase
        .from("candidaturas")
        .update({ status_aprovacao: "rejeitado" })
        .eq("id_candidatura", candidatura.id_candidatura);
      if (error) throw error;

      setCandidaturas((prev) =>
        prev.map((item) =>
          item.id_candidatura === candidatura.id_candidatura
            ? { ...item, status_aprovacao: "rejeitado" }
            : item,
        ),
      );
      addToast(
        "success",
        `Candidatura de ${candidatura.curriculo.nome} rejeitada.`,
      );
    } catch (error: any) {
      console.error("Erro ao rejeitar candidato:", error);
      addToast(
        "error",
        "Erro ao rejeitar candidato. Tente novamente mais tarde.",
      );
    } finally {
      setProcessandoId(null);
    }
  }

  const abrirChatComJovem = (idJovem: string) => {
    navigate("/mensagensEmpresa", { state: { idJovemSelecionado: idJovem } });
  };

  const handlePrint = () => window.print();

  function renderStatus(status: string | null) {
    if (status === "aceito") {
      return (
        <span className={`${styles.statusBadge} ${styles.statusAceito}`}>
          <Check size={14} /> Aceito
        </span>
      );
    }
    if (status === "rejeitado") {
      return (
        <span className={`${styles.statusBadge} ${styles.statusRejeitado}`}>
          <X size={14} /> Rejeitado
        </span>
      );
    }
    return (
      <span className={`${styles.statusBadge} ${styles.statusPendente}`}>
        <Clock size={14} /> Pendente
      </span>
    );
  }

  // Filtragem de candidatos
  const candidatosFiltrados = candidaturas.filter((cand) => {
    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "pendentes" &&
        (!cand.status_aprovacao || cand.status_aprovacao === "pendente")) ||
      (filtroStatus === "aceitos" && cand.status_aprovacao === "aceito") ||
      (filtroStatus === "rejeitados" && cand.status_aprovacao === "rejeitado");

    const matchBusca =
      cand.curriculo.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      cand.vaga.titulo.toLowerCase().includes(termoBusca.toLowerCase());

    const matchVaga = vagaFiltro === "todas" || cand.vaga.titulo === vagaFiltro;

    return matchStatus && matchBusca && matchVaga;
  });

  // Contadores para as abas
  const countTodos = candidaturas.length;
  const countPendentes = candidaturas.filter(
    (c) => !c.status_aprovacao || c.status_aprovacao === "pendente",
  ).length;
  const countAceitos = candidaturas.filter(
    (c) => c.status_aprovacao === "aceito",
  ).length;
  const countRejeitados = candidaturas.filter(
    (c) => c.status_aprovacao === "rejeitado",
  ).length;

  // Paginação
  const totalPaginas =
    Math.ceil(candidatosFiltrados.length / itensPorPagina) || 1;
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const candidatosPaginados = candidatosFiltrados.slice(
    indiceInicio,
    indiceInicio + itensPorPagina,
  );

  const listaVagasUnicas = Array.from(
    new Set(candidaturas.map((c) => c.vaga.titulo)),
  );

  return (
    <div className={styles.container}>
      {/* Sistema de Toasts estilo LinkedIn */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${
              toast.type === "success" ? styles.toastSuccess : styles.toastError
            }`}
          >
            {toast.type === "success" ? (
              <span className={styles.toastIconSuccess}>
                <CheckCircle2 size={20} />
              </span>
            ) : (
              <span className={styles.toastIconError}>
                <AlertCircle size={20} />
              </span>
            )}
            <div className={styles.toastMessage}>{toast.message}</div>
          </div>
        ))}
      </div>

      <div className="no-print">
        <SidebarEmpresa />
      </div>

      <main className={`${styles.content} no-print`}>
        <header className={styles.headerArea}>
          <div className={styles.headerText}>
            <h1>Candidatos às Suas Vagas</h1>
            <p>
              Gerencie e acompanhe os jovens que se candidataram às vagas
              publicadas pela sua empresa.
            </p>
          </div>
          <button
            className={styles.btnExportar}
            onClick={() =>
              addToast("success", "Relatório exportado com sucesso!")
            }
          >
            <Download size={16} /> Exportar relatórios
          </button>
        </header>

        {/* Barra de Abas e Filtros */}
        <div className={styles.filterBar}>
          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tabButton} ${filtroStatus === "todos" ? styles.active : ""}`}
              onClick={() => {
                setFiltroStatus("todos");
                setPaginaAtual(1);
              }}
            >
              Todos <span>{countTodos}</span>
            </button>
            <button
              className={`${styles.tabButton} ${filtroStatus === "pendentes" ? styles.active : ""}`}
              onClick={() => {
                setFiltroStatus("pendentes");
                setPaginaAtual(1);
              }}
            >
              Pendentes <span>{countPendentes}</span>
            </button>
            <button
              className={`${styles.tabButton} ${filtroStatus === "aceitos" ? styles.active : ""}`}
              onClick={() => {
                setFiltroStatus("aceitos");
                setPaginaAtual(1);
              }}
            >
              Aceitos <span>{countAceitos}</span>
            </button>
            <button
              className={`${styles.tabButton} ${filtroStatus === "rejeitados" ? styles.active : ""}`}
              onClick={() => {
                setFiltroStatus("rejeitados");
                setPaginaAtual(1);
              }}
            >
              Rejeitados <span>{countRejeitados}</span>
            </button>
          </div>

          <div className={styles.searchFilters}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar por nome ou vaga..."
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  setPaginaAtual(1);
                }}
              />
            </div>

            <div className={styles.vagaSelectWrapper}>
              <span className={styles.vagaSelectIcon}>
                <Filter size={16} />
              </span>
              <select
                className={styles.vagaSelect}
                value={vagaFiltro}
                onChange={(e) => {
                  setVagaFiltro(e.target.value);
                  setPaginaAtual(1);
                }}
              >
                <option value="todas">Todas as vagas</option>
                {listaVagasUnicas.map((vagaNome, idx) => (
                  <option key={idx} value={vagaNome}>
                    {vagaNome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando candidaturas...</div>
        ) : candidatosPaginados.length === 0 ? (
          <div className={styles.semCandidatos}>
            <div className={styles.emptyIcon}>
              <Users size={28} />
            </div>
            <h2>Nenhum candidato encontrado</h2>
            <p>
              Quando um jovem se candidatar às suas vagas, ele aparecerá aqui.
            </p>
          </div>
        ) : (
          <>
            <section className={styles.candidatosSection}>
              <div className={styles.candidatosGrid}>
                {candidatosPaginados.map((cand) => {
                  const processando = processandoId === cand.id_candidatura;
                  const nomeCurriculoPdf = `curriculo_${cand.curriculo.nome.toLowerCase().replace(/\s+/g, "_")}.pdf`;
                  const iniciais = obterIniciais(cand.curriculo.nome);

                  return (
                    <article
                      key={cand.id_candidatura}
                      className={styles.cardCandidato}
                    >
                      <div className={styles.cardHeaderTop}>
                        <div className={styles.candidatoAvatarInfo}>
                          <div className={styles.avatarCircle}>{iniciais}</div>
                          <div className={styles.candidatoTitles}>
                            <h2 title={cand.curriculo.nome}>
                              {cand.curriculo.nome}
                            </h2>
                            <span>{cand.vaga.titulo}</span>
                          </div>
                        </div>
                        <div className={styles.cardHeaderRight}>
                          <span className={styles.dataTag}>
                            <Calendar size={13} />{" "}
                            {new Date(cand.data_candidatura).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          {renderStatus(cand.status_aprovacao)}
                        </div>
                      </div>

                      <div className={styles.infoGrid}>
                        <div className={styles.infoBox}>
                          <div className={styles.infoBoxHeader}>
                            <GraduationCap size={13} /> Curso
                          </div>
                          <strong title={cand.curriculo.curso}>
                            {cand.curriculo.curso}
                          </strong>
                        </div>
                        <div className={styles.infoBox}>
                          <div className={styles.infoBoxHeader}>
                            <Building size={13} /> Instituição
                          </div>
                          <strong title={cand.curriculo.instituicao}>
                            {cand.curriculo.instituicao}
                          </strong>
                        </div>
                        <div className={styles.infoBox}>
                          <div className={styles.infoBoxHeader}>
                            <Clock size={13} /> Período
                          </div>
                          <strong title={cand.curriculo.periodo}>
                            {cand.curriculo.periodo}
                          </strong>
                        </div>
                      </div>

                      <div className={styles.contactSection}>
                        <div className={styles.contactTitle}>
                          Informações de Contato
                        </div>
                        <p className={styles.contactItem}>
                          <Mail size={15} /> {cand.curriculo.email}
                        </p>
                        <p className={styles.contactItem}>
                          <Phone size={15} /> {cand.curriculo.telefone}
                        </p>
                        <p className={styles.contactItem}>
                          <MapPin size={15} /> {cand.curriculo.endereco}
                        </p>
                      </div>

                      {/* Caixa de Currículo em Anexo */}
                      <div className={styles.curriculoBox}>
                        <div className={styles.curriculoInfo}>
                          <span className={styles.fileIcon}>
                            <FileText size={24} />
                          </span>
                          <div>
                            <span>{nomeCurriculoPdf}</span>
                            <small>PDF • 324 KB</small>
                          </div>
                        </div>
                        <button
                          className={styles.btnDownloadCurriculo}
                          onClick={() => setCandidaturaSelecionada(cand)}
                          title="Ver Currículo"
                        >
                          <Download size={16} />
                        </button>
                      </div>

                      {/* Mensagem do Candidato */}
                      <div className={styles.mensagemBox}>
                        <div className={styles.mensagemHeader}>
                          <span>Mensagem do candidato</span>
                          <small>
                            {new Date(cand.data_candidatura).toLocaleDateString(
                              "pt-BR",
                            )}{" "}
                            às{" "}
                            {new Date(cand.data_candidatura).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </small>
                        </div>
                        <p>
                          {cand.curriculo.descricao ||
                            "Tenho interesse na vaga e acredito que minhas habilidades podem contribuir com a equipe."}
                        </p>
                      </div>

                      <div className={styles.cardFooter}>
                        <button
                          className={styles.btnChat}
                          onClick={() => abrirChatComJovem(cand.id_candidato)}
                        >
                          <MessageSquare size={15} /> Chat
                        </button>

                      
                        {cand.status_aprovacao !== "aceito" && (
                          <button
                            className={styles.btnAceitar}
                            disabled={processando}
                            onClick={() => aceitarCandidato(cand)}
                          >
                            <Check size={15} /> Aceitar
                          </button>
                        )}

                        {cand.status_aprovacao !== "rejeitado" && (
                          <button
                            className={styles.btnRejeitar}
                            disabled={processando}
                            onClick={() => rejeitarCandidato(cand)}
                          >
                            <X size={15} /> Rejeitar
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className={styles.paginationContainer}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                  disabled={paginaAtual === 1}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                {Array.from({ length: totalPaginas }).map((_, idx) => (
                  <button
                    key={idx}
                    className={`${styles.pageBtn} ${paginaAtual === idx + 1 ? styles.active : ""}`}
                    onClick={() => setPaginaAtual(idx + 1)}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  onClick={() =>
                    setPaginaAtual((p) => Math.min(p + 1, totalPaginas))
                  }
                  disabled={paginaAtual === totalPaginas}
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Visualização de Currículo e Pré-Entrevista */}
      {candidaturaSelecionada && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContainer} cv-print-area`}>
            <div className={`${styles.modalActions} no-print`}>
              <button className={styles.btnImprimir} onClick={handlePrint}>
                <Printer size={16} /> Imprimir / Salvar PDF
              </button>
              <button
                className={styles.btnFechar}
                onClick={() => setCandidaturaSelecionada(null)}
              >
                <X size={18} />
              </button>
            </div>

            <header className={styles.cvHeader}>
              <h1>{candidaturaSelecionada.curriculo.nome}</h1>
              <p>
                <strong>Vaga pretendida:</strong>{" "}
                {candidaturaSelecionada.vaga.titulo}
              </p>
              <div className={styles.cvContact}>
                <span>
                  <strong>Email:</strong>{" "}
                  {candidaturaSelecionada.curriculo.email}
                </span>
                <span>
                  <strong>Telefone:</strong>{" "}
                  {candidaturaSelecionada.curriculo.telefone}
                </span>
                <span>
                  <strong>Endereço:</strong>{" "}
                  {candidaturaSelecionada.curriculo.endereco}
                </span>
              </div>
            </header>

            {candidaturaSelecionada.curriculo.descricao && (
              <section className={styles.cvSection}>
                <h3>Resumo</h3>
                <p>{candidaturaSelecionada.curriculo.descricao}</p>
              </section>
            )}

            {candidaturaSelecionada.curriculo.curso && (
              <section className={styles.cvSection}>
                <h3>Formação / Curso</h3>
                <p className={styles.cvPreWrap}>
                  Curso: {candidaturaSelecionada.curriculo.curso} | Instituição:{" "}
                  {candidaturaSelecionada.curriculo.instituicao} | Período:{" "}
                  {candidaturaSelecionada.curriculo.periodo}
                </p>
              </section>
            )}

            {candidaturaSelecionada.curriculo.competencias && (
              <section className={styles.cvSection}>
                <h3>Competências & Habilidades</h3>
                <p className={styles.cvPreWrap}>
                  {candidaturaSelecionada.curriculo.competencias}
                </p>
              </section>
            )}

            {candidaturaSelecionada.curriculo.experiencias && (
              <section className={styles.cvSection}>
                <h3>Experiências</h3>
                <p className={styles.cvPreWrap}>
                  {candidaturaSelecionada.curriculo.experiencias}
                </p>
              </section>
            )}

            <section className={styles.cvSection}>
              <h3>Pré-Entrevista</h3>
              {candidaturaSelecionada.preEntrevistas.length === 0 ? (
                <div className={styles.preEntrevistaVazia}>
                  <p>O candidato ainda não respondeu à pré-entrevista.</p>
                </div>
              ) : (
                candidaturaSelecionada.preEntrevistas.map((preEntrevista) => (
                  <div
                    key={preEntrevista.formulario.id}
                    className={styles.preEntrevista}
                  >
                    <div className={styles.preEntrevistaHeader}>
                      <h4>{preEntrevista.formulario.title}</h4>
                      {preEntrevista.resposta.created_at && (
                        <span>
                          Respondida em{" "}
                          {new Date(
                            preEntrevista.resposta.created_at,
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    {preEntrevista.formulario.description && (
                      <p className={styles.preEntrevistaDescricao}>
                        {preEntrevista.formulario.description}
                      </p>
                    )}
                    <div className={styles.respostasPreEntrevista}>
                      {preEntrevista.formulario.questions.map(
                        (pergunta, index) => {
                          const resposta =
                            preEntrevista.resposta.answers[pergunta.id];
                          return (
                            <div
                              key={pergunta.id}
                              className={styles.respostaPreEntrevista}
                            >
                              <div className={styles.numeroPergunta}>
                                {index + 1}
                              </div>
                              <div className={styles.conteudoResposta}>
                                <strong>{pergunta.question_text}</strong>
                                <p className={styles.textoResposta}>
                                  {formatarRespostaPreEntrevista(resposta)}
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>

            <footer className={styles.cvFooter}>
              CIJA — Centro de Integração Jovem Aprendiz
            </footer>
          </div>
        </div>
      )}

      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .cv-print-area, .cv-print-area * { visibility: visible; }
            .cv-print-area {
              position: absolute; left: 0; top: 0; width: 100% !important; max-width: 100% !important; box-shadow: none !important; border: none !important;
            }
            .no-print { display: none !important; }
          }
        `}
      </style>
    </div>
  );
};

export default CandidatosEmpresa;
