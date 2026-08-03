import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import styles from "./menuEmpresa.module.css";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

interface Vaga {
  id_vag: string;
  id_em: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  salario: number;
  data_publicada: string;
}

interface EmpresaData {
  nome: string;
  email: string;
  logo: string | null;
  data_cadastro: string;
}

interface Metrica {
  visualizacoes: number;
  candidaturas: number;
  interesses: number;
  mensagens: number;
}

const MenuEmpresa: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  useDocumentTitle("CIJA - Menu da Empresa");
  const [metricas, setMetricas] = useState({
    vagasLancadas: 0,
    alcanceTotal: 0,
  });
  const [empresa, setEmpresa] = useState<EmpresaData>({
    nome: "",
    email: "",
    logo: null,
    data_cadastro: "",
  });
  const [desempenho, setDesempenho] = useState<Metrica>({
    visualizacoes: 0,
    candidaturas: 0,
    interesses: 0,
    mensagens: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function carregarDashboard() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const uid = user.id;

        const { data: perfil } = await supabase
          .from("perfil_empresa")
          .select("logo, nome_empresa, data_cadastro")
          .eq("id_usuario", uid)
          .maybeSingle();

        if (perfil) {
          setEmpresa({
            nome: perfil.nome_empresa || user.email?.split("@")[0] || "Empresa",
            email: user.email || "",
            logo: perfil.logo || null,
            data_cadastro: perfil.data_cadastro || new Date().toISOString(),
          });
        } else {
          setEmpresa({
            nome: user.email?.split("@")[0] || "Empresa",
            email: user.email || "",
            logo: null,
            data_cadastro: user.created_at || new Date().toISOString(),
          });
        }

        const { data: listaVagas, error } = await supabase
          .from("vaga")
          .select("*")
          .eq("id_em", uid)
          .order("data_publicada", { ascending: false });

        if (!error && listaVagas) {
          setVagas(listaVagas as Vaga[]);

          const { count: totalCandidaturas } = await supabase
            .from("candidaturas")
            .select("*", { count: "exact", head: true })
            .eq("id_empresa", uid);

          setMetricas({
            vagasLancadas: listaVagas.length,
            alcanceTotal: totalCandidaturas || 0,
          });
        }

        setDesempenho({
          visualizacoes: 0,
          candidaturas: 0,
          interesses: 0,
          mensagens: 0,
        });
      } catch (err) {
        console.error("Erro ao carregar dados da dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    carregarDashboard();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <SidebarEmpresa />
        <div className={styles.mainWrapper}>
          <main
            className={styles.content}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                fontSize: "18px",
                color: "#a855f7",
                fontWeight: 600,
              }}
            >
              Carregando painel de controle...
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SidebarEmpresa />

      <div className={styles.mainWrapper}>
        <main className={styles.content}>
          <div className={styles.header}>
            <h1>Olá, {empresa.nome.split(" ")[0]}! 👋</h1>
            <p>
              Acompanhe em tempo real o desempenho das suas oportunidades
              publicadas.
            </p>
          </div>

          <div className={styles.gridTopoPrincipal}>
            <div className={styles.cardMetrica}>
              <div className={styles.cardMetricaHeader}>
                <div className={styles.metaLabel}>VAGAS PUBLICADAS</div>
                <div className={styles.metaIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
              </div>
              <div>
                <div className={styles.metaValor}>{metricas.vagasLancadas}</div>
                <div className={styles.metaSub}>Ativas no momento</div>
              </div>
            </div>

            <div className={styles.cardMetrica}>
              <div className={styles.cardMetricaHeader}>
                <div className={styles.metaLabel}>INTERESSES RECEBIDOS</div>
                <div className={styles.metaIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
              <div>
                <div className={styles.metaValor} style={{ color: "#ffffff" }}>
                  {metricas.alcanceTotal}
                </div>
                <div className={styles.metaSub}>Últimos 30 dias</div>
              </div>
            </div>

            <div
              className={styles.cardPerfilEmpresa}
              onClick={() => navigate("/perfilEmpresa")}
            >
              <div className={styles.cardPerfilHeader}>
                <div className={styles.metaLabel}>PERFIL DA EMPRESA</div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>

              <div className={styles.perfilEmpresaConteudo}>
                <div className={styles.perfilAvatar}>
                  {empresa.logo ? (
                    <img src={empresa.logo} alt={empresa.nome} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {empresa.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className={styles.perfilDados}>
                  <h3>{empresa.nome}</h3>
                  <p>{empresa.email}</p>
                  <span className={styles.badgeVerificada}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Conta verificada
                  </span>
                  <span className={styles.perfilData}>
                     Cadastrado em{" "}
                    {new Date(empresa.data_cadastro).toLocaleDateString(
                      "pt-BR",
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.gridMeio}>
            <div className={styles.cardVagasAtivas}>
              <div className={styles.cardHeader}>
                <h2 className={styles.secaoTitulo}>
                  <span style={{ color: "#a855f7" }}>|</span> Minhas Vagas
                  Ativas
                </h2>
                <button
                  className={styles.btnVerTodas}
                  onClick={() => navigate("/vagasEmpresa")}
                >
                  Ver todas <span>→</span>
                </button>
              </div>

              {vagas.length === 0 ? (
                <p className={styles.semVagas}>
                  Você ainda não publicou nenhuma vaga. Vá até a tela de vagas
                  para criar a sua primeira!
                </p>
              ) : (
                <div
                  className={styles.vagaItem}
                  onClick={() => navigate("/vagasEmpresa")}
                >
                  <div className={styles.vagaItemHeader}>
                    <div className={styles.vagaLogo}>
                      {empresa.logo ? (
                        <img src={empresa.logo} alt="" />
                      ) : (
                        <span>{empresa.nome.charAt(0)}</span>
                      )}
                    </div>
                    <div className={styles.vagaInfo}>
                      <h4>{vagas[0].titulo}</h4>
                      <span>
                        Publicada em{" "}
                        {new Date(vagas[0].data_publicada).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                  </div>
                  <p className={styles.vagaDescricao}>{vagas[0].descricao}</p>
                  <div className={styles.vagaFooter}>
                    <span className={styles.vagaTag}>
                      {vagas[0].carga_horaria}h semanais
                    </span>
                    <span className={styles.vagaSalario}>
                      R$ {vagas[0].salario}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.cardDesempenho}>
              <div className={styles.cardHeader}>
                <h2 className={styles.secaoTitulo}>Desempenho das Vagas</h2>
                <select className={styles.selectPeriodo}>
                  <option>Últimos 7 dias</option>
                  <option>Últimos 30 dias</option>
                </select>
              </div>

              <div className={styles.graficoPlaceholder}>
                <div className={styles.graficoLinhas}>
                  <div className={styles.linhaGrafico}></div>
                  <div className={styles.linhaGrafico}></div>
                  <div className={styles.linhaGrafico}></div>
                  <div className={styles.linhaGrafico}></div>
                </div>
                <div className={styles.graficoEixoX}>
                  <span>02/06</span>
                  <span>03/06</span>
                  <span>04/06</span>
                  <span>05/06</span>
                  <span>06/06</span>
                  <span>07/06</span>
                  <span>08/06</span>
                </div>
              </div>

              <div className={styles.metricasInferiores}>
                <div className={styles.metricaItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <div>
                    <strong>{desempenho.visualizacoes}</strong>
                    <span>Visualizações</span>
                  </div>
                </div>
                <div className={styles.metricaItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <div>
                    <strong>{desempenho.candidaturas}</strong>
                    <span>Candidaturas</span>
                  </div>
                </div>
                <div className={styles.metricaItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <div>
                    <strong>{desempenho.interesses}</strong>
                    <span>Interesses</span>
                  </div>
                </div>
                <div className={styles.metricaItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <div>
                    <strong>{desempenho.mensagens}</strong>
                    <span>Mensagens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default MenuEmpresa;
