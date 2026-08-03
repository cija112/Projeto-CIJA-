import React, { useEffect, useState } from "react";
import styles from "./candidatosEmpresa.module.css";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { supabase } from "../../../supabaseClient";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";
import ModalEnviarPreEntrevista from "../../../components/modalEnviarPreEntrevista";

interface Candidatura {
  id_candidatura: string;
  data_candidatura: string;
  id_candidato: string;
  vaga: {
    titulo: string;
    id_em: string;
  };
  curriculo?: {
    nome: string;
    telefone: string;
    endereco: string;
    email: string;
    descricao: string;
    competencias: string;
    experiencias: string;
    curso: string;
  };
}

export const CandidatosEmpresa: React.FC = () => {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidaturaSelecionada, setCandidaturaSelecionada] = useState<Candidatura | null>(null);

  // Estados do Modal de Pré-Entrevista
  const [modalPreEntrevistaAberto, setModalPreEntrevistaAberto] = useState(false);
  const [candidatoParaEnviar, setCandidatoParaEnviar] = useState<{ id: string; nome: string } | null>(null);

  const navigate = useNavigate();
  useDocumentTitle("CIJA - Candidatos às suas Vagas");

  useEffect(() => {
    buscarCandidatos();
  }, []);

  async function buscarCandidatos() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Busca as vagas criadas por esta empresa
      const { data: vagasData, error: vagasError } = await supabase
        .from("vaga")
        .select("id_vaga, titulo, id_em")
        .eq("id_em", user.id);

      if (vagasError) throw vagasError;

      if (!vagasData || vagasData.length === 0) {
        setCandidaturas([]);
        setLoading(false);
        return;
      }

      const idsVagas = vagasData.map((v) => v.id_vaga);

      // 2. Busca as candidaturas associadas a essas vagas
      const { data: candData, error: candError } = await supabase
        .from("candidaturas")
        .select("id_candidatura, data_candidatura, id_candidato, id_vaga")
        .in("id_vaga", idsVagas)
        .order("data_candidatura", { ascending: false });

      if (candError) throw candError;

      if (!candData || candData.length === 0) {
        setCandidaturas([]);
        setLoading(false);
        return;
      }

      const idsCandidatos = candData.map((c) => c.id_candidato);

      // 3. Busca currículos cadastrados
      const { data: currData } = await supabase
        .from("curriculos")
        .select("*")
        .in("id_ja", idsCandidatos);

      // 4. Junta as informações (exibe o candidato mesmo sem currículo preenchido)
      const listaFormatada: Candidatura[] = candData.map((c) => {
        const vagaInfo = vagasData.find((v) => v.id_vaga === c.id_vaga);
        const currInfo = currData?.find((curr) => curr.id_ja === c.id_candidato);

        return {
          id_candidatura: c.id_candidatura,
          data_candidatura: c.data_candidatura,
          id_candidato: c.id_candidato,
          vaga: {
            titulo: vagaInfo?.titulo || "Vaga não encontrada",
            id_em: vagaInfo?.id_em || "",
          },
          curriculo: currInfo
            ? {
                nome: currInfo.nome || "Candidato sem nome",
                telefone: currInfo.telefone || "Não informado",
                endereco: currInfo.endereco || "Não informado",
                email: currInfo.email || "Não informado",
                descricao: currInfo.descricao || "",
                competencias: currInfo.competencias || "",
                experiencias: currInfo.experiencias || "",
                curso: currInfo.curso || "Não informado",
              }
            : {
                nome: "Jovem Aprendiz (Sem Currículo)",
                telefone: "Não informado",
                endereco: "Não informado",
                email: "Não informado",
                descricao: "",
                competencias: "",
                experiencias: "",
                curso: "Não informado",
              },
        };
      });

      setCandidaturas(listaFormatada);
    } catch (error) {
      console.error("Erro ao buscar candidatos:", error);
    } finally {
      setLoading(false);
    }
  }

  const abrirChatComJovem = (idJovem: string) => {
    navigate("/mensagensEmpresa", { state: { idJovemSelecionado: idJovem } });
  };

  const abrirModalPreEntrevista = (idJovem: string, nomeJovem: string) => {
    setCandidatoParaEnviar({ id: idJovem, nome: nomeJovem });
    setModalPreEntrevistaAberto(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <div className="no-print">
        <SidebarEmpresa />
      </div>

      <div className={`${styles.mainContent} no-print`}>
        <header className={styles.header}>
          <h1>Candidatos às Suas Vagas</h1>
          <p>Gerencie os Jovens Aprendizes que se candidataram às suas oportunidades</p>
        </header>

        {loading ? (
          <p style={{ color: "#a78bfa" }}>Carregando candidaturas...</p>
        ) : candidaturas.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Nenhum candidato encontrado</h3>
            <p>Assim que os jovens se candidatarem às suas vagas, os perfis aparecerão aqui.</p>
          </div>
        ) : (
          <div className={styles.gridCandidatos}>
            {candidaturas.map((cand) => (
              <div key={cand.id_candidatura} className={styles.cardCandidato}>
                <div className={styles.cardHeader}>
                  <span className={styles.tagVaga}>{cand.vaga.titulo}</span>
                  <span className={styles.dataTag}>
                    {new Date(cand.data_candidatura).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <h2>{cand.curriculo?.nome}</h2>
                  <p className={styles.infoText}>
                    <strong>Curso:</strong> {cand.curriculo?.curso}
                  </p>
                  <p className={styles.infoText}>
                    <strong>Email:</strong> {cand.curriculo?.email}
                  </p>
                  <p className={styles.infoText}>
                    <strong>Telefone:</strong> {cand.curriculo?.telefone}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={styles.btnChat}
                    onClick={() => abrirChatComJovem(cand.id_candidato)}
                  >
                    💬 Chat
                  </button>

                  <button
                    className={styles.btnVisualizar}
                    style={{ background: "linear-gradient(90deg, #9333ea, #7c3aed)" }}
                    onClick={() =>
                      abrirModalPreEntrevista(
                        cand.id_candidato,
                        cand.curriculo?.nome || "Candidato"
                      )
                    }
                  >
                    📝 Pré-Entrevista
                  </button>

                  <button
                    className={styles.btnVisualizar}
                    onClick={() => setCandidaturaSelecionada(cand)}
                  >
                    Ver Currículo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE VISUALIZAÇÃO DE CURRÍCULO E IMPRESSÃO */}
      {candidaturaSelecionada && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} cv-print-area`}>
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={handlePrint}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🖨️ Imprimir / Salvar PDF
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() =>
                    abrirModalPreEntrevista(
                      candidaturaSelecionada.id_candidato,
                      candidaturaSelecionada.curriculo?.nome || "Candidato"
                    )
                  }
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#7c3aed",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  📝 Enviar Pré-Entrevista
                </button>

                <button
                  onClick={() => setCandidaturaSelecionada(null)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>

            <header style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "20px" }}>
              <h1 style={{ fontSize: "24px", color: "#0f172a", margin: "0 0 6px 0", fontWeight: "bold", textTransform: "uppercase" }}>
                {candidaturaSelecionada.curriculo?.nome}
              </h1>
              <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 4px 0" }}>
                <strong>Vaga Pretendida:</strong> {candidaturaSelecionada.vaga.titulo}
              </p>
              <div style={{ fontSize: "12px", color: "#64748b", display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <span><strong>Email:</strong> {candidaturaSelecionada.curriculo?.email}</span>
                <span><strong>Tel:</strong> {candidaturaSelecionada.curriculo?.telefone}</span>
                <span><strong>Endereço:</strong> {candidaturaSelecionada.curriculo?.endereco}</span>
              </div>
            </header>

            {candidaturaSelecionada.curriculo?.descricao && (
              <section style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", color: "#1e293b", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", marginBottom: "8px", textTransform: "uppercase" }}>
                  Resumo Profissional
                </h3>
                <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: 0 }}>
                  {candidaturaSelecionada.curriculo.descricao}
                </p>
              </section>
            )}

            {candidaturaSelecionada.curriculo?.curso && (
              <section style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", color: "#1e293b", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", marginBottom: "8px", textTransform: "uppercase" }}>
                  Formação / Curso
                </h3>
                <p style={{ fontSize: "13px", color: "#334155", margin: 0, fontWeight: 500 }}>
                  {candidaturaSelecionada.curriculo.curso}
                </p>
              </section>
            )}

            {candidaturaSelecionada.curriculo?.competencias && (
              <section style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", color: "#1e293b", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", marginBottom: "8px", textTransform: "uppercase" }}>
                  Competências & Habilidades
                </h3>
                <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>
                  {candidaturaSelecionada.curriculo.competencias}
                </p>
              </section>
            )}

            {candidaturaSelecionada.curriculo?.experiencias && (
              <section style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", color: "#1e293b", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", marginBottom: "8px", textTransform: "uppercase" }}>
                  Experiências Anteriores
                </h3>
                <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>
                  {candidaturaSelecionada.curriculo.experiencias}
                </p>
              </section>
            )}

            <div style={{ marginTop: "30px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", textAlign: "center" }}>
              <div style={{ fontWeight: "bold", fontSize: "11.5px", color: "#64748B", marginBottom: "8px" }}>
                CIJA — Centro de Integração Jovem Aprendiz
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENVIO DA PRÉ-ENTREVISTA */}
      {candidatoParaEnviar && (
        <ModalEnviarPreEntrevista
          isOpen={modalPreEntrevistaAberto}
          onClose={() => setModalPreEntrevistaAberto(false)}
          idJovemAprendiz={candidatoParaEnviar.id}
          nomeCandidato={candidatoParaEnviar.nome}
        />
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .cv-print-area, .cv-print-area * { visibility: visible; }
          .cv-print-area { position: absolute; left: 0; top: 0; width: 100% !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default CandidatosEmpresa;