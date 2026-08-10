import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../../../../components/sideBar/sideBar";
import { supabase } from "../../../../supabaseClient";
import styles from "./vagaSelecionada.module.css";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
// --- ÍCONES (Mantidos exatamente como no seu original) ---
const MapPinIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const ClockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const BrainIcon = () => (
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
    <path d="M12 2a6 6 0 0 0-6 6c0 1.67.41 3.25 1.15 4.65C8.07 13.9 9.25 15 10.5 15.8V18a2 2 0 1 0 4 0v-2.2c1.25-.8 2.43-1.9 3.35-3.15A7.99 7.99 0 0 0 18 8a6 6 0 0 0-6-6Z" />
    <path d="M12 18v2" />
    <path d="M8 20h8" />
  </svg>
);
const sendIcon = () => (
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
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);
const UserCheckIcon = () => (
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
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);
const ShieldIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="40"
    height="40"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const BriefcaseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const DollarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const BookmarkIcon = ({ fill = "none" }: { fill?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

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

const VagaSelecionada: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [jaCandidatado, setJaCandidatado] = useState(false);
  const [isModeloOpen, setModeloOpen] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [notificacao, setNotificacao] = useState<string | null>(null);
  useDocumentTitle("CIJA - Vaga Selecionada");
  const mostrarNotificacao = (mensagem: string) => {
    setNotificacao(mensagem);
    setTimeout(() => setNotificacao(null), 3000);
  };

  useEffect(() => {
    async function inicializar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: fav } = await supabase
          .from("vagas_favoritas")
          .select("id_vag")
          .eq("id_ja", user.id);
        if (fav) setFavoritos(fav.map((f) => f.id_vag));
      }
    }
    inicializar();
  }, []);

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

      setVaga({ ...vagaData, empresa: empresaCompleta });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: cand } = await supabase
          .from("candidaturas")
          .select("id_candidatura")
          .eq("id_vaga", id)
          .eq("id_candidato", user.id)
          .maybeSingle();
        if (cand) setJaCandidatado(true);
      }
      setLoading(false);
    }
    carregarDetalhesVaga();
  }, [id]);

  async function toggleFavorito(idVag: string) {
    if (!userId) {
      mostrarNotificacao("Você precisa estar logado para favoritar.");
      return;
    }
    const isFav = favoritos.includes(idVag);
    if (isFav) {
      const { error } = await supabase
        .from("vagas_favoritas")
        .delete()
        .eq("id_ja", userId)
        .eq("id_vag", idVag);
      if (!error) {
        setFavoritos((prev) => prev.filter((id) => id !== idVag));
        mostrarNotificacao("Vaga removida dos favoritos!");
      }
    } else {
      const { error } = await supabase
        .from("vagas_favoritas")
        .insert({ id_ja: userId, id_vag: idVag });
      if (!error) {
        setFavoritos((prev) => [...prev, idVag]);
        mostrarNotificacao("Vaga favoritada com sucesso!");
      }
    }
  }

  const handleCandidatura = async () => {
    if (!userId || !vaga) {
      mostrarNotificacao("Você precisa estar logado para se candidatar.");
      return;
    }
    if (jaCandidatado) {
      if (window.confirm("Tem certeza que deseja cancelar sua candidatura?")) {
        const { error } = await supabase
          .from("candidaturas")
          .delete()
          .eq("id_vaga", vaga.id_vag)
          .eq("id_candidato", userId);
        if (error) {
          mostrarNotificacao("Não foi possível cancelar a candidatura.");
        } else {
          setJaCandidatado(false);
          mostrarNotificacao("Candidatura cancelada.");
        }
      }
    } else {
      if (
        window.confirm(
          `Deseja confirmar sua candidatura para "${vaga.titulo}"?`,
        )
      ) {
        const { error } = await supabase.from("candidaturas").insert({
          id_vaga: vaga.id_vag,
          id_candidato: userId,
          data_candidatura: new Date().toISOString(),
        });
        if (error) {
          mostrarNotificacao("Erro ao realizar a candidatura.");
        } else {
          setJaCandidatado(true);
          mostrarNotificacao("Candidatura realizada com sucesso!");
        }
      }
    }
  };

  if (loading)
    return (
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.contentLoading}>
          <p>Carregando detalhes da vaga...</p>
        </main>
      </div>
    );
  if (!vaga)
    return (
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.contentLoading}>
          <p>Vaga não encontrada.</p>
        </main>
      </div>
    );

  const nomeEmpresa = vaga.empresa?.nome || "Empresa Parceira";
  const letraInicial = nomeEmpresa.charAt(0).toUpperCase();
  const estaFavoritada = favoritos.includes(vaga.id_vag);

  return (
    <div className={styles.container}>
      <Sidebar />
      {notificacao && (
        <div className={styles.toastNotification}>{notificacao}</div>
      )}
      <main className={styles.content}>
        <div className={styles.topActions}>
          <button onClick={() => navigate("/vagas")} className={styles.backBtn}>
            <ArrowLeftIcon /> <span>Voltar para vagas</span>
          </button>
          <button
            className={`${styles.saveBtn} ${estaFavoritada ? styles.saved : ""}`}
            onClick={() => toggleFavorito(vaga.id_vag)}
          >
            <BookmarkIcon fill={estaFavoritada ? "currentColor" : "none"} />
            <span>
              {estaFavoritada ? "Vaga favoritada" : "Favoritar esta vaga"}
            </span>
          </button>
        </div>
        <div className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <h1 className={styles.jobTitle}>{vaga.titulo}</h1>
            <div className={styles.quickSpecs}>
              <div className={styles.specBadge}>
                <MapPinIcon />{" "}
                <span>
                  {vaga.cidade} - {vaga.estado}{" "}
                  {vaga.tipo ? `(${vaga.tipo})` : ""}
                </span>
              </div>
              <div className={styles.specBadge}>
                <BriefcaseIcon /> <span>{nomeEmpresa}</span>
              </div>
              <div className={styles.specBadge}>
                <ClockIcon />{" "}
                <span>Carga Horária: {vaga.carga_horaria}h/semana</span>
              </div>
              <div className={styles.specBadge}>
                <DollarIcon />{" "}
                <span>
                  Salário: R$ {Number(vaga.salario).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
            <section
              className={styles.sectionBlock}
              style={{ borderTop: "1px solid #1e1b4b", paddingTop: "24px" }}
            >
              <h3 className={styles.sectionTitle}>Descrição da vaga:</h3>
              <div className={styles.descriptionText}>{vaga.descricao}</div>
            </section>
          </div>
          <div className={styles.rightColumn}>
            <div className={styles.sidebarCardCompany}>
              <h4 className={styles.cardHeaderTitle}>Sobre a empresa</h4>
              <div className={styles.companyRow}>
                <div className={styles.companyLogo}>
                  {vaga.empresa?.avatarempresa_url ? (
                    <img
                      src={vaga.empresa.avatarempresa_url}
                      alt={nomeEmpresa}
                    />
                  ) : (
                    <span>{letraInicial}</span>
                  )}
                </div>
                <div className={styles.companyMeta}>
                  <h5>{nomeEmpresa}</h5>
                  <p className={styles.companyDescription}>
                    Parceira integrada ao ecossistema do Centro de Integração
                    Jovem Aprendiz.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  navigate(`/perfilEmpresa/${vaga.empresa?.id_em}`)
                }
                className={styles.outlineLinkBtn}
              >
                Ver perfil da empresa
              </button>
            </div>
            <div className={styles.sidebarCard}>
              <h4 className={styles.cardHeaderTitle}>Informações da vaga</h4>
              <div className={styles.infoMetaRow}>
                <div className={styles.infoMetaIcon}>
                  <BriefcaseIcon />
                </div>
                <div className={styles.infoMetaContent}>
                  <span>Tipo de contrato</span>
                  <strong>{vaga.contrato}</strong>
                </div>
              </div>
              {vaga.data_publicada && (
                <div className={styles.infoMetaRow}>
                  <div className={styles.infoMetaIcon}>
                    <ClockIcon />
                  </div>
                  <div className={styles.infoMetaContent}>
                    <span>Publicado em</span>
                    <strong>
                      {new Date(vaga.data_publicada).toLocaleDateString(
                        "pt-BR",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() =>
                !jaCandidatado ? setModeloOpen(true) : handleCandidatura()
              }
              className={`${styles.applyPrimaryBtn} ${jaCandidatado ? styles.applied : ""}`}
            >
              <SendIcon />{" "}
              <span>
                {jaCandidatado ? "Cancelar Candidatura" : "Candidatar-se"}
              </span>
            </button>
            {isModeloOpen && (
              <div className={styles.modalOverlay}>
                <div
                  className={styles.modalContainer}
                >
                  <header className={styles.modalHeader}>
                    <div>
                      <h2>Como funciona sua candidatura?</h2>
                      <p>
                        Entenda cada etapa do processo até você conquistar a sua
                        vaga!
                      </p>
                    </div>
                    <button
                      className={styles.closeBtn}
                      onClick={() => setModeloOpen(false)}
                    >
                      ×
                    </button>
                  </header>
                  <div className={styles.stepsGrid}>
                    {[
                      {
                        icon: <BrainIcon />,
                        title: "Revisão com IA do  CIJA ",
                        desc: "Você será redirecionado para revisar seu currículo com a inteligência artificial.",
                      },
                      {
                        icon: <SendIcon />,
                        title: "Currículo enviado",
                        desc: "Após revisado, seu currículo será enviado para a empresa responsável.",
                      },
                      {
                        icon: <UserCheckIcon />,
                        title: "Aprovação e acesso",
                        desc: "Se a empresa aprovar, você terá acesso total aos detalhes da vaga.",
                      },
                    ].map((step, idx) => (
                      <div key={idx} className={styles.stepCard}>
                        <div className={styles.iconWrapper}>
                          <div className={styles.stepNumber}>0{idx + 1}</div>
                          {step.icon}
                        </div>
                        <div className={styles.stepInfo}>
                          <h4>{step.title}</h4>
                          <p>{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.securityBanner}>
                    <ShieldIcon />
                    <span>
                      <strong>
                        Transparência e segurança em todo o processo.
                      </strong>{" "}
                      <br /> Você acompanha cada etapa da sua candidatura
                      diretamente pela plataforma.
                    </span>
                  </div>
                  <footer className={styles.modalFooter}>
                    <button
                      onClick={() => setModeloOpen(false)}
                      className={styles.secondaryBtn}
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/revisar-curriculo/${vaga.id_vag}`);
                        setModeloOpen(false);
                      }}
                      className={styles.primaryBtn}
                    >
                      Continuar →
                    </button>
                  </footer>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
export default VagaSelecionada;
