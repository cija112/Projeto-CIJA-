import styles from "./mensagemEmpresa.module.css";
import React, { useEffect, useState, useRef } from "react";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { supabase } from "../../../supabaseClient";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";

interface Mensagem {
  id_msg: string;
  id_ja: string;
  id_em: string;
  enviado_por_jovem: boolean;
  conteudo: string;
  lida: boolean;
  data_envio: string;
}

interface Conversa {
  id_ja: string;
  nome: string;
  avatar_url: string | null;
  ultima_msg?: string;
  data_envio?: string;
  nao_lidas: number;
}

interface Empresa {
  nome: string;
  avatarempresa_url: string | null;
}

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const MensagemEmpresa: React.FC = () => {
  const [userId, setUserId] = useState<string>("");
  const [empresa, setEmpresa] = useState<Empresa>({
    nome: "",
    avatarempresa_url: null,
  });
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [showSidebarEmpresa, setShowSidebarEmpresa] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useDocumentTitle("Mensagens - Empresa");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        const { data: emp } = await supabase
          .from("empresa")
          .select("nome, avatarempresa_url")
          .eq("id_em", data.user.id)
          .maybeSingle();
        if (emp) setEmpresa(emp);
      }
    };
    init();
  }, []);

  async function carregarConversas() {
    if (!userId) return;

    const { data } = await supabase
      .from("mensagens")
      .select("id_ja, conteudo, data_envio, lida, enviado_por_jovem")
      .eq("id_em", userId)
      .order("data_envio", { ascending: false });

    if (!data) return;

    const idsUnicos = Array.from(new Set(data.map((m) => m.id_ja)));

    const { data: candidatos } = await supabase
      .from("jovem_aprendiz")
      .select("id_ja, nome, avatar_url")
      .in("id_ja", idsUnicos);

    const lista: Conversa[] = idsUnicos.map((id) => {
      const pessoa = candidatos?.find((c) => c.id_ja === id);
      const msgsDoUser = data.filter((m) => m.id_ja === id);
      const ultima = msgsDoUser[0];
      const naoLidas = msgsDoUser.filter(
        (m) => !m.lida && m.enviado_por_jovem,
      ).length;

      return {
        id_ja: id,
        nome: pessoa?.nome || "Candidato",
        avatar_url: pessoa?.avatar_url || null,
        ultima_msg: ultima?.conteudo,
        data_envio: ultima?.data_envio,
        nao_lidas: naoLidas,
      };
    });

    setConversas(lista);
  }

  useEffect(() => {
    if (!userId) return;
    carregarConversas();

    const channel = supabase
      .channel("mensagens-empresa")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens",
          filter: `id_em=eq.${userId}`,
        },
        () => {
          carregarConversas();
          if (conversaAtiva) abrirConversa(conversaAtiva);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversaAtiva]);

  async function abrirConversa(id_ja: string) {
    setConversaAtiva(id_ja);

    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq("id_em", userId)
      .eq("id_ja", id_ja)
      .order("data_envio", { ascending: true });

    setMensagens(data || []);

    await supabase
      .from("mensagens")
      .update({ lida: true })
      .eq("id_em", userId)
      .eq("id_ja", id_ja)
      .eq("enviado_por_jovem", true);
  }

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  async function enviarMensagem() {
    if (!texto.trim() || !conversaAtiva) return;

    if (texto.length > 2000) {
      alert("A mensagem pode ter no máximo 2000 caracteres.");
      return;
    }

    await supabase.from("mensagens").insert({
      id_em: userId,
      id_ja: conversaAtiva,
      conteudo: texto,
      enviado_por_jovem: false,
      lida: false,
      data_envio: new Date().toISOString(),
    });
   
    setTexto("");
  }

  const conversaAtual = conversas.find((c) => c.id_ja === conversaAtiva);

  const irParaPerfil = (idJa: string) => {
    navigate(`/perfil/${idJa}`);
  };

  return (
    <div className={styles.app}>
      {showSidebarEmpresa && <SidebarEmpresa />}

      <div className={styles.container}>
        <aside
          className={`${styles.sidebar} ${conversaAtiva ? styles.sidebarHiddenMobile : ""}`}
        >
          <div className={styles.sidebarHeader}>
            <button
              className={styles.menuBtn}
              onClick={() => setShowSidebarEmpresa(!showSidebarEmpresa)}
            >
              <MenuIcon />
            </button>
            <h2>Mensagens</h2>
          </div>

          <div
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            {" "}
            <ArrowLeftIcon />
            <span>Voltar</span>
          </div>

          {conversas.length === 0 ? (
            <div className={styles.emptyList}>
              <p>Nenhuma conversa ainda</p>
            </div>
          ) : (
            conversas.map((c) => (
              <div
                key={c.id_ja}
                className={`${styles.conversaItem} ${conversaAtiva === c.id_ja ? styles.conversaAtiva : ""}`}
                onClick={() => abrirConversa(c.id_ja)}
              >
                <img
                  src={
                    c.avatar_url ||
                    "https://www.gravatar.com/avatar/00000000?d=mp&f=y"
                  }
                  className={styles.avatar}
                  alt={c.nome}
                />
                <div className={styles.conversaText}>
                  <strong>{c.nome}</strong>
                  <p>{c.ultima_msg}</p>
                </div>
                {c.nao_lidas > 0 && (
                  <div className={styles.badgeNaoLidas}>{c.nao_lidas}</div>
                )}
              </div>
            ))
          )}
        </aside>

        {!conversaAtiva && (
          <div className={styles.empty}>
            <h2>Comece a conversar</h2>
            <p>Selecione uma conversa para visualizar as mensagens.</p>
          </div>
        )}

        {conversaAtiva && conversaAtual && (
          <div className={styles.chatArea}>
            <div className={styles.chatHeader}>
              <button
                className={styles.btnVoltarMobile}
                onClick={() => setConversaAtiva(null)}
              >
                <ArrowLeftIcon />
              </button>
              <div
                className={styles.perfilClicavel}
                onClick={() => irParaPerfil(conversaAtual.id_ja)}
              >
                <img
                  src={
                    conversaAtual.avatar_url ||
                    "https://www.gravatar.com/avatar/00000000?d=mp&f=y"
                  }
                  className={styles.chatAvatar}
                  alt={conversaAtual.nome}
                />
                <div className={styles.perfilInfo}>
                  <h3>{conversaAtual.nome}</h3>
                  <span className={styles.verPerfil}>Ver perfil</span>
                </div>
              </div>
            </div>

            <div className={styles.messages}>
              {mensagens.map((m) => (
                <div
                  key={m.id_msg}
                  className={
                    m.enviado_por_jovem ? styles.msgRowLeft : styles.msgRowRight
                  }
                >
                  {m.enviado_por_jovem && (
                    <img
                      src={
                        conversaAtual.avatar_url ||
                        "https://www.gravatar.com/avatar/00000000?d=mp&f=y"
                      }
                      className={styles.msgAvatar}
                      alt="Jovem"
                    />
                  )}
                  <div
                    className={
                      m.enviado_por_jovem ? styles.msgLeft : styles.msgRight
                    }
                  >
                    {m.conteudo}
                  </div>
                  {!m.enviado_por_jovem && (
                    <img
                      src={
                        empresa.avatarempresa_url ||
                        "https://www.gravatar.com/avatar/00000000?d=mp&f=y"
                      }
                      className={styles.msgAvatar}
                      alt="Empresa"
                    />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <input
                value={texto}
                maxLength={2000}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite uma mensagem..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensagem();
                  }
                }}
              />
              <button onClick={enviarMensagem}>Enviar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MensagemEmpresa;
