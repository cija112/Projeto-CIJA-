import React, { useEffect, useState } from "react";
import { Sidebar } from "../../../components/sideBar/sideBar";
import styles from "./favoritos.module.css";
import { supabase } from "../../../supabaseClient";
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
  data_favoritado?: string;
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
    <path d="M17 5H9.5a3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const HeartBrokenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 0 0 0 0 -7.78z" />
    <path d="M12 11l-4 4m0-4l4 4" />
  </svg>
);

const Favoritos: React.FC = () => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [minhasCandidaturas, setMinhasCandidaturas] = useState<string[]>([]);
  useDocumentTitle("CIJA - Vagas Favoritas");
  const navigate=  useNavigate();
  useEffect(() => {
    async function inicializar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: cand } = await supabase
        .from("candidaturas")
        .select("id_vaga")
        .eq("id_candidato", user.id);
      if (cand) setMinhasCandidaturas(cand.map((c) => c.id_vaga));

      await buscarFavoritas(user.id);
    }
    inicializar();
  }, []);

  async function buscarFavoritas(uid: string) {
    const { data: favData, error: favError } = await supabase
      .from("vagas_favoritas")
      .select("id_vag, created_at")
      .eq("id_ja", uid)
      .order("created_at", { ascending: false });

    if (favError || !favData || favData.length === 0) {
      setVagas([]);
      setLoading(false);
      return;
    }

    const idsVagas = favData.map((f) => f.id_vag);
    const datasFav = new Map(favData.map((f) => [f.id_vag, f.created_at]));

    const { data: vagasData } = await supabase
      .from("vaga")
      .select("*")
      .in("id_vag", idsVagas);

    if (!vagasData) {
      setVagas([]);
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
      data_publicada: v.data_publicada,
      cidade: v.cidade || "São Paulo",
      estado: v.estado || "SP",
      tipo: v.tipo || "Híbrido",
      contrato: v.contrato || "CLT",
      empresa: empresasMap.get(v.id_em) || null,
      data_favoritado: datasFav.get(v.id_vag),
    }));

    setVagas(vagasFormatadas);
    setLoading(false);
  }

  async function removerFavorito(idVag: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("vagas_favoritas")
      .delete()
      .eq("id_ja", userId)
      .eq("id_vag", idVag);

    if (!error) {
      setVagas((prev) => prev.filter((v) => v.id_vag !== idVag));
    }
  }

  async function candidatarSe(idVag: string) {
    if (!userId) {
      alert("Você precisa estar logado para se candidatar.");
      return;
    }

    const { error } = await supabase.from("candidaturas").insert([
      {
        id_vaga: idVag,
        id_candidato: userId,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        alert("Você já se candidatou a esta vaga!");
      } else {
        alert("Erro ao enviar candidatura: " + error.message);
        console.error(error);
      }
    } else {
      alert("Candidatura realizada com sucesso!");
      setMinhasCandidaturas((prev) => [...prev, idVag]);
    }
  }

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>Vagas Favoritas</h1>
            <p>Suas oportunidades salvas para aplicar depois.</p>
            {!loading && (
              <span className={styles.count}>
                {vagas.length}{" "}
                {vagas.length === 1 ? "vaga salva" : "vagas salvas"}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Carregando favoritos...</p>
        ) : vagas.length === 0 ? (
          <div className={styles.emptyState}>
            <HeartBrokenIcon />
            <h3>Nenhuma vaga favoritada</h3>
            <p>Salve vagas interessantes clicando no ícone de bookmark.</p>
          </div>
        ) : (
          <div className={styles.vagasGrid}>
            {vagas.map((vaga) => {
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

                  <p className={styles.descricao}>{vaga.descricao}</p>

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
                    <button onClick={() => navigate(`/vaga-selecionada/${vaga.id_vag}`)} className={styles.detailBtn}>Ver detalhes</button>
                    <button
                      className={
                        jaCandidatado
                          ? `${styles.botao} ${styles.candidatado}`
                          : styles.botao
                      }
                      onClick={() =>
                        !jaCandidatado && candidatarSe(vaga.id_vag)
                      }
                      disabled={jaCandidatado}
                    >
                      {jaCandidatado ? "Candidatado" : "Candidatar-se"}
                    </button>
                    <button
                      className={`${styles.bookmarkBtn} ${styles.bookmarked}`}
                      onClick={() => removerFavorito(vaga.id_vag)}
                      aria-label="Remover dos favoritos"
                    >
                      <BookmarkIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favoritos;
