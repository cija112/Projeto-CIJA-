import React, { useEffect, useState } from "react";
import { Sidebar } from "../../../components/sideBar/sideBar";
import styles from "./candidaturas.module.css";
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
  titulo: string;
  descricao: string;
  cidade: string;
  estado: string;
  tipo: string;
  contrato: string;
  salario: number;
  carga_horaria: number;
  empresa: Empresa | null;
}

interface Candidatura {
  id_candidatura: string;
  id_vaga: string;
  data_candidatura: string;
  vaga: Vaga | null;
}

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const Candidaturas: React.FC = () => {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [vagas, setVagas] = useState<any[]>([]);

  useDocumentTitle("CIJA - Minhas Candidaturas");

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
      await buscarCandidaturas(user.id);
    }
    inicializar();
  }, []);

  async function buscarCandidaturas(uid: string) {
    setLoading(true);

    // SEM COLUNA STATUS - SÓ O QUE EXISTE
    const { data: candData, error: candError } = await supabase
      .from("candidaturas")
      .select("id_candidatura, id_vaga, data_candidatura")
      .eq("id_candidato", uid)
      .order("data_candidatura", { ascending: false });

    if (candError) {
      console.error("Erro ao buscar candidaturas:", candError);
      setLoading(false);
      return;
    }

    if (!candData || candData.length === 0) {
      setCandidaturas([]);
      setLoading(false);
      return;
    }

    const idsVagas = candData.map((c) => c.id_vaga);

    const { data: vagasData, error: vagasError } = await supabase
      .from("vaga")
      .select(
        "id_vag, titulo, descricao, cidade, estado, tipo, contrato, salario, carga_horaria, id_em",
      )
      .in("id_vag", idsVagas);

    if (vagasError) {
      console.error("Erro ao buscar vagas:", vagasError);
      setLoading(false);
      return;
    }

    const idsEmpresas = Array.from(
      new Set(vagasData?.map((v) => v.id_em).filter(Boolean) || []),
    );
    const { data: empresasData } = await supabase
      .from("empresa")
      .select("id_em, nome, avatarempresa_url")
      .in("id_em", idsEmpresas);

    const vagasMap = new Map<string, any>();
    vagasData?.forEach((v) => vagasMap.set(v.id_vag, v));

    const empresasMap = new Map<string, Empresa>();
    empresasData?.forEach((e: Empresa) => empresasMap.set(e.id_em, e));

    const candidaturasCompletas = candData.map((c: any, vagas) => {
      const vaga = vagasMap.get(c.id_vaga);
      setVagas(vaga);
      const empresa = vaga ? empresasMap.get(vaga.id_em) : null;

      return {
        id_candidatura: c.id_candidatura,
        id_vaga: c.id_vaga,
        data_candidatura: c.data_candidatura,
        vaga: vaga
          ? {
              id_vag: vaga.id_vag,
              titulo: vaga.titulo,
              descricao: vaga.descricao,
              cidade: vaga.cidade,
              estado: vaga.estado,
              tipo: vaga.tipo,
              contrato: vaga.contrato,
              salario: vaga.salario,
              carga_horaria: vaga.carga_horaria,
              empresa: empresa || null,
            }
          : null,
      };
    });

    setCandidaturas(candidaturasCompletas);
    setLoading(false);
  }

  async function descandidatar(idCand: string) {
    if (
      !window.confirm(
        "Tem certeza que deseja cancelar sua candidatura para esta vaga?",
      )
    )
      return;

    const { error } = await supabase
      .from("candidaturas")
      .delete()
      .eq("id_candidatura", idCand);

    if (error) {
      console.error("Erro ao cancelar:", error);
      alert("Erro ao cancelar candidatura");
    } else {
      setCandidaturas(
        (prev) => prev.filter((y) => y.id_candidatura !== idCand), // pega lista mais atualizada,contendo a vaga que usuario quer
        //mais atualizada e remove ela se for diferente das outras
      );
    }
  }

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>Minhas Candidaturas</h1>
            <p>Acompanhe todas as vagas que você se candidatou.</p>
            {!loading && (
              <span className={styles.count}>
                {candidaturas.length}{" "}
                {candidaturas.length === 1 ? "candidatura" : "candidaturas"}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Carregando candidaturas...</p>
        ) : candidaturas.length === 0 ? (
          <div className={styles.emptyState}>
            <BriefcaseIcon />
            <h3>Nenhuma candidatura ainda</h3>
            <p>Explore as vagas disponíveis e candidate-se às oportunidades.</p>
          </div>
        ) : (
          <div className={styles.candidaturasGrid}>
            {candidaturas.map((cand) => {
              const nomeEmpresa =
                cand.vaga?.empresa?.nome || "Empresa Parceira";
              const letraInicial = nomeEmpresa.charAt(0).toUpperCase();
              return (
                <div
                  key={cand.id_candidatura}
                  className={styles.card}
                  onClick={() => navigate(`/vaga-selecionada/${cand.id_vaga}`)}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.empresaInfo}>
                      <div className={styles.companyLogo}>
                        {cand.vaga?.empresa?.avatarempresa_url ? (
                          <img
                            src={cand.vaga.empresa.avatarempresa_url}
                            alt={nomeEmpresa}
                          />
                        ) : (
                          <span>{letraInicial}</span>
                        )}
                      </div>
                      <div>
                        <h3 className={styles.empresaNome}>{nomeEmpresa}</h3>
                        <h4 className={styles.vagaTitulo}>
                          {cand.vaga?.titulo}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className={styles.descricao}>{cand.vaga?.descricao}</p>

                  <div className={styles.details}>
                    <div className={styles.detailItem}>
                      <MapPinIcon />
                      <span>
                        {cand.vaga?.cidade}, {cand.vaga?.estado} •{" "}
                        {cand.vaga?.tipo}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <BriefcaseIcon />
                      <span>{cand.vaga?.contrato}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <ClockIcon />
                      <span>{cand.vaga?.carga_horaria}h semanais</span>
                    </div>
                    <div className={styles.detailItem}>
                      <DollarIcon />
                      <span>
                        R${" "}
                        {Number(cand.vaga?.salario || 0).toLocaleString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <ClockIcon />
                      <span>
                        Aplicado em{" "}
                        {new Date(cand.data_candidatura).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => descandidatar(cand.id_candidatura)}
                    >
                      <TrashIcon />
                      <span>Descandidatar</span>
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

export default Candidaturas;
