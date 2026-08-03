import { Sidebar } from "../../../../components/sideBar/sideBar";
import React, { useEffect, useState, useMemo } from "react";
import styles from "./vagas.module.css";
import { supabase } from "../../../../supabaseClient";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";

interface Empresa {
  id_em: string;
  nome: string;
  avatarempresa_url: string | null;
}

interface Vaga {
  id_vag: string;
  id_em: string;
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
  is_favorita?: boolean;
}

interface Filtros {
  busca: string;
  tipo: string;
  contrato: string;
  cidade: string;
  salarioMin: number;
  salarioMax: number;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const FilterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Vagas: React.FC = () => {
  const [vagasOriginais, setVagasOriginais] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  useDocumentTitle("CIJA - Vagas Disponíveis");
  const [userId, setUserId] = useState<string | null>(null);
  const [minhasCandidaturas, setMinhasCandidaturas] = useState<string[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();
  const [showFiltros, setShowFiltros] = useState(false);
  const [sortBy, setSortBy] = useState<"recentes" | "salario">("recentes");
  const [filtros, setFiltros] = useState<Filtros>({
    busca: "",
    tipo: "",
    contrato: "",
    cidade: "",
    salarioMin: 0,
    salarioMax: 20000,
  });

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    async function inicializar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let favs: string[] = [];
      let cands: string[] = [];

      if (user) {
        setUserId(user.id);

        const { data: cand } = await supabase
          .from("candidaturas")
          .select("id_vaga")
          .eq("id_candidato", user.id);
        if (cand) {
          cands = cand.map((c) => c.id_vaga);
          setMinhasCandidaturas(cands);
        }

        const { data: fav } = await supabase
          .from("vagas_favoritas")
          .select("id_vag")
          .eq("id_ja", user.id);
        if (fav) {
          favs = fav.map((f) => f.id_vag);
          setFavoritos(favs);
        }
      }

      await buscarVagas(favs);
    }
    inicializar();
  }, []);

  async function buscarVagas(favoritosArray: string[]) {
    const { data: vagasData, error: vagasError } = await supabase
      .from("vaga")
      .select("*")
      .order("data_publicada", { ascending: false });

    if (vagasError) {
      console.error("Erro ao buscar vagas:", vagasError);
      setLoading(false);
      return;
    }

    if (!vagasData || vagasData.length === 0) {
      setVagasOriginais([]);
      setLoading(false);
      return;
    }

    const idsEmpresas = Array.from(
      new Set(vagasData.map((v) => v.id_em).filter(Boolean)),
    );

    const { data: empresasData } = await supabase
      .from("empresa")
      .select("id_em, nome, avatarempresa_url")
      .in("id_em", idsEmpresas);

    const empresasMap = new Map<string, Empresa>();
    empresasData?.forEach((e: Empresa) => empresasMap.set(e.id_em, e));

    const vagasFormatadas: Vaga[] = vagasData.map((v: any) => ({
      id_vag: v.id_vag,
      id_em: v.id_em,
      titulo: v.titulo,
      descricao: v.descricao,
      carga_horaria: v.carga_horaria || 40,
      salario: v.salario || 0,
      data_publicada: v.data_publicada || new Date().toISOString(),
      cidade: v.cidade || "São Paulo",
      estado: v.estado || "SP",
      tipo: v.tipo || "Híbrido",
      contrato: v.contrato || "CLT",
      empresa: empresasMap.get(v.id_em) || null,
      is_favorita: favoritosArray.includes(v.id_vag),
    }));

    setVagasOriginais(vagasFormatadas);

    setLoading(false);
  }

  useEffect(() => {
    setVagasOriginais((prev) =>
      prev.map((v) => ({
        ...v,
        is_favorita: favoritos.includes(v.id_vag),
      })),
    );
  }, [favoritos]);

  const vagasFiltradas = useMemo(() => {
    let resultado = [...vagasOriginais];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (v) =>
          v.titulo.toLowerCase().includes(busca) ||
          v.descricao.toLowerCase().includes(busca) ||
          v.empresa?.nome.toLowerCase().includes(busca),
      );
    }

    if (filtros.tipo)
      resultado = resultado.filter((v) => v.tipo === filtros.tipo);
    if (filtros.contrato)
      resultado = resultado.filter((v) => v.contrato === filtros.contrato);
    if (filtros.cidade) {
      resultado = resultado.filter((v) =>
        v.cidade.toLowerCase().includes(filtros.cidade.toLowerCase()),
      );
    }

    resultado = resultado.filter(
      (v) => v.salario >= filtros.salarioMin && v.salario <= filtros.salarioMax,
    );

    if (sortBy === "salario") {
      resultado.sort((a, b) => b.salario - a.salario);
    } else {
      resultado.sort(
        (a, b) =>
          new Date(b.data_publicada).getTime() -
          new Date(a.data_publicada).getTime(),
      );
    }

    return resultado;
  }, [vagasOriginais, filtros, sortBy]);

  const cidadesDisponiveis = useMemo(() => {
    return Array.from(new Set(vagasOriginais.map((v) => v.cidade))).sort();
  }, [vagasOriginais]);

  const limparFiltros = () => {
    setFiltros({
      busca: "",
      tipo: "",
      contrato: "",
      cidade: "",
      salarioMin: 0,
      salarioMax: 20000,
    });
  };

  const filtrosAtivos =
    filtros.busca ||
    filtros.tipo ||
    filtros.contrato ||
    filtros.cidade ||
    filtros.salarioMin > 0 ||
    filtros.salarioMax < 20000;

 

  async function toggleFavorito(idVag: string) {
    if (!userId) {
      showToast("Você precisa estar logado para favoritar.", "error");
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
        showToast("Removido dos favoritos", "success");
      }
    } else {
      const { error } = await supabase
        .from("vagas_favoritas")
        .insert({ id_ja: userId, id_vag: idVag });

      if (!error) {
        setFavoritos((prev) => [...prev, idVag]);
        showToast("Vaga salva nos favoritos!", "success");
      }
    }
  }

  return (
    <div className={styles.container}>
      <Sidebar />

      {/* TOAST CONTAINER */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            {toast.type === "success" && <CheckIcon />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <main className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>Vagas Disponíveis</h1>
            <p>Encontre oportunidades para impulsionar sua carreira.</p>
            {!loading && (
              <span className={styles.count}>
                {vagasFiltradas.length} vagas encontradas
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.filterBtn} ${filtrosAtivos ? styles.filterActive : ""}`}
              onClick={() => setShowFiltros(true)}
            >
              <FilterIcon />
              <span>Filtros {filtrosAtivos && "•"}</span>
            </button>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recentes" | "salario")
              }
            >
              <option value="recentes">Mais recentes</option>
              <option value="salario">Maior salário</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Carregando vagas...</p>
        ) : vagasFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma vaga encontrada com esses filtros.</p>
            {filtrosAtivos && (
              <button onClick={limparFiltros} className={styles.clearBtn}>
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className={styles.vagasGrid}>
            {vagasFiltradas.map((vaga) => {
              const jaCandidatado = minhasCandidaturas.includes(vaga.id_vag);
              const nomeEmpresa = vaga.empresa?.nome || "Empresa Parceira";
              const letraInicial = nomeEmpresa.charAt(0).toUpperCase();

              return (
                <div key={vaga.id_vag} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.empresaInfo}>
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
                      <div>
                        <h3 className={styles.empresaNome}>{nomeEmpresa}</h3>
                        <h4 className={styles.vagaTitulo}>{vaga.titulo}</h4>
                      </div>
                    </div>
                  </div>
                  <p className={styles.descricao}>
                    {vaga.descricao.length > 50
                      ? `${vaga.descricao.slice(0, 50)}...`
                      : vaga.descricao}
                    {/*  mantem limite de 50 caracteres, se passar ele recorta ate 50 so */}
                  </p>

                  <div className={styles.details}>
                    <div className={styles.detailItem}>
                      <MapPinIcon />
                      <span>
                        {vaga.cidade}, {vaga.estado} • {vaga.tipo}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <ClockIcon />
                      <span>{vaga.carga_horaria}h semanais</span>
                    </div>
                    <div className={styles.detailItem}>
                      <BriefcaseIcon />
                      <span>{vaga.contrato}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <DollarIcon />
                      <span>
                        R$ {Number(vaga.salario).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      onClick={() =>
                        navigate(`/vaga-selecionada/${vaga.id_vag}`)
                      }
                      className={styles.detailBtn}
                    >
                      Ver mais detalhes
                    </button>
                  
                    <button
                      className={`${styles.bookmarkBtn} ${vaga.is_favorita ? styles.bookmarked : ""}`}
                      onClick={() => toggleFavorito(vaga.id_vag)}
                      aria-label="Favoritar vaga"
                    >
                      <BookmarkIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showFiltros && (
          <>
            <div
              className={styles.modalOverlay}
              onClick={() => setShowFiltros(false)}
            />
            <div className={styles.modalFiltros}>
              <div className={styles.modalHeader}>
                <h3>Filtros</h3>
                <button
                  onClick={() => setShowFiltros(false)}
                  className={styles.closeBtn}
                >
                  <XIcon />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.filtroGroup}>
                  <label>Buscar</label>
                  <input
                    type="text"
                    placeholder="Cargo, empresa..."
                    value={filtros.busca}
                    onChange={(e) =>
                      setFiltros({ ...filtros, busca: e.target.value })
                    }
                    className={styles.inputFiltro}
                  />
                </div>

                <div className={styles.filtroGroup}>
                  <label>Tipo de Trabalho</label>
                  <select
                    value={filtros.tipo}
                    onChange={(e) =>
                      setFiltros({ ...filtros, tipo: e.target.value })
                    }
                    className={styles.selectFiltro}
                  >
                    <option value="">Todos</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Remoto">Remoto</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>

                <div className={styles.filtroGroup}>
                  <label>Contrato</label>
                  <select
                    value={filtros.contrato}
                    onChange={(e) =>
                      setFiltros({ ...filtros, contrato: e.target.value })
                    }
                    className={styles.selectFiltro}
                  >
                    <option value="">Todos</option>
                    <option value="CLT">CLT</option>
                    <option value="PJ">PJ</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Temporário">Temporário</option>
                  </select>
                </div>

                <div className={styles.filtroGroup}>
                  <label>Cidade</label>
                  <select
                    value={filtros.cidade}
                    onChange={(e) =>
                      setFiltros({ ...filtros, cidade: e.target.value })
                    }
                    className={styles.selectFiltro}
                  >
                    <option value="">Todas</option>
                    {cidadesDisponiveis.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filtroGroup}>
                  <label>Faixa Salarial</label>
                  <div className={styles.rangeWrapper}>
                    <input
                      type="range"
                      min="0"
                      max="20000"
                      step="500"
                      value={filtros.salarioMin}
                      onChange={(e) =>
                        setFiltros({
                          ...filtros,
                          salarioMin: Number(e.target.value),
                        })
                      }
                      className={styles.range}
                    />
                    <div className={styles.rangeValues}>
                      <span>
                        R$ {filtros.salarioMin.toLocaleString("pt-BR")}
                      </span>
                      <span>
                        R$ {filtros.salarioMax.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button onClick={limparFiltros} className={styles.clearBtn}>
                  Limpar
                </button>
                <button
                  onClick={() => setShowFiltros(false)}
                  className={styles.applyBtn}
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Vagas;
