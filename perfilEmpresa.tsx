import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import React, { useEffect, useState } from "react";
import styles from "./perfilEmpresa.module.css";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

function formatarTelefone(telefone: string) {
  if (!telefone) return "Número de telefone não informado pela empresa.";
  const formatNumeros = telefone.replace(/\D/g, "");

  if (formatNumeros.length === 13) {
    const pais = formatNumeros.substring(0, 2);
    const ddd = formatNumeros.substring(2, 4);
    const parte1 = formatNumeros.substring(4, 9);
    const parte2 = formatNumeros.substring(9, 13);
    return `+${pais} (${ddd}) ${parte1}-${parte2}`;
  }
  if (formatNumeros.length === 11) {
    const ddd = formatNumeros.substring(0, 2);
    const parte1 = formatNumeros.substring(2, 7);
    const parte2 = formatNumeros.substring(7, 11);
    return `+55 (${ddd}) ${parte1}-${parte2}`;
  }
  return telefone;
}

export default function PerfilEmpresa() {
  const navigate = useNavigate();
  useDocumentTitle("CIJA - Perfil da Empresa");

  const params = useParams();
  const pathSegments = window.location.pathname.split("/").filter(Boolean);

  // Captura o ID de forma blindada (independente de estar como :id, :id_em ou vindo da URL)
  const urlId = Object.values(params)[0] || pathSegments[1];

  // Se houver um ID extra na URL além do caminho base, identifica como visualização externa do jovem
  const isVisualizacaoDoJovem = pathSegments.length > 1 || !!urlId;

  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    vagas: 0,
    candidatos: 0,
    processo: 0,
    contratados: 0,
  });

  const [atividades, setAtividades] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  function getTempoRelativo(dateString: string | Date) {
    if (!dateString) return "recente";
    const agora = new Date();
    const dataPassada = new Date(dateString);
    const diferencaEmMs = agora.getTime() - dataPassada.getTime();

    const minutos = Math.floor(diferencaEmMs / (1000 * 60));
    const horas = Math.floor(diferencaEmMs / (1000 * 60 * 60));
    const dias = Math.floor(diferencaEmMs / (1000 * 60 * 60 * 24));

    if (minutos < 1) return "agora mesmo";
    if (minutos < 60) return `há ${minutos} min`;
    if (horas < 24) return `há ${horas} ${horas === 1 ? "hora" : "horas"}`;
    return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  }

  useEffect(() => {
    loadData();
  }, [urlId]);

  async function loadData() {
    try {
      setLoading(true);

      let empData = null;
      let empError = null;

      if (isVisualizacaoDoJovem && urlId) {
        // Busca a empresa específica selecionada pelo jovem aprendiz
        const { data, error } = await supabase
          .from("empresa")
          .select("*")
          .eq("id_em", urlId)
          .maybeSingle();
        empData = data;
        empError = error;
      } else {
        // Fluxo padrão da própria empresa logada visualizando seu painel interno
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("empresa")
            .select("*")
            .eq("id_em", user.id)
            .maybeSingle();

          empData = data;
          empError = error;

          if (!data && !error) {
            const { data: fallbackData } = await supabase
              .from("empresa")
              .select("*")
              .limit(1)
              .maybeSingle();
            empData = fallbackData;
          }
        }
      }

      if (empError) console.error("Erro do Supabase:", empError.message);

      if (!empData) {
        setEmpresa(null);
        setLoading(false);
        return;
      }

      setEmpresa(empData);
      const alvoId = empData.id_em;

      // Buscando as vagas e contadores para os cards informativos
      const { data: vagas } = await supabase
        .from("vaga")
        .select("id_vag, titulo, data_publicada")
        .eq("id_em", alvoId)
        .order("data_publicada", { ascending: false });

      const vagasIds = vagas?.map((v) => v.id_vag) || [];

      const { count: vCount } = await supabase
        .from("vaga")
        .select("*", { count: "exact", head: true })
        .eq("id_em", alvoId);

      let c = 0,
        p = 0,
        h = 0;

      if (vagasIds.length > 0) {
        const { count: c1 } = await supabase
          .from("candidaturas")
          .select("*", { count: "exact", head: true })
          .in("id_vag", vagasIds);
        const { count: c2 } = await supabase
          .from("candidaturas")
          .select("*", { count: "exact", head: true })
          .in("id_vag", vagasIds)
          .eq("status", "em_processo");
        const { count: c3 } = await supabase
          .from("candidaturas")
          .select("*", { count: "exact", head: true })
          .in("id_vag", vagasIds)
          .eq("status", "contratado");
        c = c1 || 0;
        p = c2 || 0;
        h = c3 || 0;
      }

      setStats({
        vagas: vCount || 0,
        candidatos: c,
        processo: p,
        contratados: h,
      });

      // Se for jovem aprendiz tentando acessar, n libera funcoes e tals
      if (isVisualizacaoDoJovem) {
        setLoading(false);
        return;
      }

      const acts: any[] = [];
      if (vagas && vagas.length > 0) {
        acts.push({
          tipo: "vaga",
          titulo: "Nova vaga publicada",
          desc: `${vagas[0].titulo} - ${new Date(vagas[0].data_publicada).toLocaleDateString("pt-BR")}`,
          tempo: getTempoRelativo(vagas[0].data_publicada),
        });
      }

      if (vagasIds.length > 0) {
        const { data: cand } = await supabase
          .from("candidaturas")
          .select(
            `created_at, vaga:vaga(titulo), jovem_aprendiz:jovem_aprendiz(nome, avatar_url)`,
          )
          .in("id_vag", vagasIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cand) {
          const ja = Array.isArray(cand.jovem_aprendiz)
            ? cand.jovem_aprendiz[0]
            : cand.jovem_aprendiz;
          const vg = Array.isArray(cand.vaga) ? cand.vaga[0] : cand.vaga;
          acts.push({
            tipo: "user",
            titulo: "Novo candidato inscrito!",
            desc: `${ja?.nome || "Candidato"} se candidatou para a vaga de ${vg?.titulo || ""}`,
            tempo: getTempoRelativo(cand.created_at),
            foto: ja?.avatar_url,
          });
        }
      }

      setAtividades(acts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !empresa || isVisualizacaoDoJovem) return;
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (ev) => {
        img.src = ev.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const size = 400;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d")!;

          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;

          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

          canvas.toBlob(
            async (blob) => {
              if (!blob) return;
              const path = `${user.id}/avatar-${Date.now()}.jpg`;
              const { error } = await supabase.storage
                .from("avatars")
                .upload(path, blob, {
                  upsert: true,
                  contentType: "image/jpeg",
                });

              if (error) {
                setUploading(false);
                return;
              }

              const { data } = supabase.storage
                .from("avatars")
                .getPublicUrl(path);
              await supabase
                .from("empresa")
                .update({ avatarempresa_url: data.publicUrl })
                .eq("id_em", empresa.id_em);

              setEmpresa({ ...empresa, avatarempresa_url: data.publicUrl });
              setUploading(false);
            },
            "image/jpeg",
            0.9,
          );
        };
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  }

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // ==================== TELA DE CARREGAMENTO ====================
  if (loading){
    setTimeout(() => {

  },3500);
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at top, #18052d 0%, #07010f 65%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}
      >
        {/* Blobs */}
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            top: "-15%",
            right: "-10%",
            background: "rgba(147,51,234,0.18)",
            filter: "blur(110px)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            bottom: "-15%",
            left: "-10%",
            background: "rgba(88,28,135,0.16)",
            filter: "blur(110px)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "90%",
            maxWidth: 380,
            background:
              "linear-gradient(180deg, rgba(24,12,42,0.85) 0%, rgba(11,4,20,0.9) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: "44px 32px",
            backdropFilter: "blur(24px)",
            boxShadow:
              "0 30px 100px rgba(0,0,0,0.6), 0 0 40px rgba(147,51,234,0.1)",
            textAlign: "center",
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 24px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "#a855f7",
                borderRightColor: "#9333ea",
                animation: "spin 0.85s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                background: "rgba(168,85,247,0.1)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>

          <h2
            style={{
              margin: 0,
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            Carregando perfil da empresa
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "#a8a3b7",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Buscando informações e métricas no ambiente CIJA...
          </p>

          {/* Barra de progresso */}
          <div
            style={{
              marginTop: 28,
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "40%",
                background: "linear-gradient(90deg, #9333ea, #c084fc)",
                borderRadius: 99,
                animation: "load 2.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } }
          @keyframes load { 0% { transform: translateX(-120%); } 50% { transform: translateX(250%); } 100% { transform: translateX(-120%); } }
        `}</style>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className={isVisualizacaoDoJovem ? styles.pagePublica : styles.page}>
        {!isVisualizacaoDoJovem && <SidebarEmpresa />}
        <main
          className={isVisualizacaoDoJovem ? styles.mainPublico : styles.main}
        >
          <div style={{ padding: 40, fontFamily: "sans-serif" }}>
            <h2 style={{ color: "#ef4444", marginBottom: 8 }}>
              Empresa não encontrada
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>
              Não conseguimos localizar nenhuma empresa com este identificador.
            </p>
            <button
              className={styles.btnVoltar}
              onClick={() => navigate(-1)}
              style={{ marginTop: 200 }}
            >
              <svg
                width="16"
                height="16"
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
              <span>Voltar</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={isVisualizacaoDoJovem ? styles.pagePublica : styles.page}>
      {/* Sidebar removida completamente se for visualização do jovem */}
      {!isVisualizacaoDoJovem && <SidebarEmpresa />}

      <main
        className={isVisualizacaoDoJovem ? styles.mainPublico : styles.main}
      >
        {/* Topbar com botão Voltar se for  Jovem Aprendiz */}
        {isVisualizacaoDoJovem && (
          <div className={styles.topBarPublica}>
            <button className={styles.btnVoltar} onClick={() => navigate(-1)}>
              <svg
                width="16"
                height="12"
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
              <span className={styles.btnVoltar2}>Voltar</span>
            </button>
          </div>
        )}

        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.avatarWrap}>
              <img
                src={
                  empresa.avatarempresa_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(empresa.nome)}&background=7c3aed&color=fff`
                }
                alt={empresa.nome}
              />
              {/* Opção de alterar foto removida para o jovem */}
              {!isVisualizacaoDoJovem && (
                <label className={styles.editAvatar}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </label>
              )}
            </div>

            <div className={styles.heroInfo}>
              <h1>
                {empresa.nome} <span className={styles.star}>★</span>
              </h1>
              <p className={styles.heroEmail}>{empresa.email}</p>
              <span className={styles.heroTag}>Empresa</span>
              <p className={styles.heroDesc}>
                Conectamos jovens talentos a oportunidades de aprendizado e
                crescimento profissional.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.container}>
          <div
            className={isVisualizacaoDoJovem ? styles.fullCol : styles.leftCol}
          >
            {/* Informações da Empresa */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  Informações da empresa
                </h2>
                {/* Botão de editar removido completamente para o Jovem */}
                {!isVisualizacaoDoJovem && (
                  <button
                    className={styles.btnEdit}
                    onClick={() => navigate("/perfilEmpresa/editar")}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar informações
                  </button>
                )}
              </div>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <label>Nome da empresa</label>
                    <p>{empresa.nome}</p>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12" y2="18" />
                    </svg>
                  </div>
                  <div>
                    <label>Telefone</label>
                    <p className={styles.phoneText}>
                      {formatarTelefone(empresa.telefone)}
                    </p>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <label>Endereço</label>
                    <p>{empresa.endereco || "Não informado"}</p>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 7l-10 5L2 7" />
                    </svg>
                  </div>
                  <div>
                    <label>E-mail</label>
                    <p>{empresa.email}</p>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <label>Data cadastrada</label>
                    <p>{formatDate(empresa.data_cadastro)}</p>
                  </div>
                </div>

                {/* CNPJ Ocultado completamente para o Jovem Aprendiz */}
                {!isVisualizacaoDoJovem && (
                  <div className={styles.infoItem}>
                    <div className={styles.infoIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <rect
                          x="2"
                          y="7"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </div>
                    <div>
                      <label>CNPJ</label>
                      <p>{empresa.cnpj}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Injeta o Resumo de Vagas abaixo em largura cheia para o Jovem */}
            {isVisualizacaoDoJovem && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                    >
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    Resumo da empresa
                  </h2>
                </div>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <div>
                      <strong>{stats.vagas}</strong>
                      <span>Vagas publicadas</span>
                    </div>
                    <div className={styles.statIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                      </svg>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div>
                      <strong>{stats.candidatos}</strong>
                      <span>Candidatos</span>
                    </div>
                    <div className={styles.statIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Atividade recente: Ocultada completamente para o jovem */}
            {!isVisualizacaoDoJovem && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                    >
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    Atividade recente
                  </h2>
                </div>
                <div className={styles.activityList}>
                  {atividades.map((a, i) => (
                    <div key={i} className={styles.activityItem}>
                      <div className={`${styles.actIcon} ${styles[a.tipo]}`}>
                        {a.tipo === "vaga" && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                          >
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                          </svg>
                        )}
                        {a.tipo === "user" &&
                          (a.foto ? (
                            <img
                              src={a.foto}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          ))}
                      </div>
                      <div className={styles.actContent}>
                        <strong>{a.titulo}</strong>
                        <p>{a.desc}</p>
                      </div>
                      <span className={styles.actTime}>{a.tempo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita (Dashboard): Renderizada apenas para a própria Empresa */}
          {!isVisualizacaoDoJovem && (
            <div className={styles.rightCol}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                    >
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    Resumo da empresa
                  </h2>
                </div>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <div>
                      <strong>{stats.vagas}</strong>
                      <span>Vagas publicadas</span>
                    </div>
                    <div className={styles.statIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                      </svg>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div>
                      <strong>{stats.candidatos}</strong>
                      <span>Candidatos</span>
                    </div>
                    <div className={styles.statIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações rápidas */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Ações rápidas
                  </h2>
                </div>
                <div className={styles.actionsList}>
                  <button onClick={() => navigate("/vagasEmpresa")}>
                    <div className={styles.actionIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <strong>Criar nova vaga</strong>
                      <span>Publique uma nova oportunidade</span>
                    </div>
                  </button>
                  <button onClick={() => navigate("/candidatosEmpresa")}>
                    <div className={styles.actionIcon}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <strong>Ver candidatos</strong>
                      <span>Acompanhe os candidatos</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
