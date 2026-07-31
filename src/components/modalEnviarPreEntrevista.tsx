import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

interface FormItem {
  id: string;
  title: string;
  description: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idJovemAprendiz: string;
  nomeCandidato?: string;
}

export const ModalEnviarPreEntrevista: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  idJovemAprendiz,
  nomeCandidato = "Candidato",
}) => {
  const [formularios, setFormularios] = useState<FormItem[]>([]);
  const [formSelecionado, setFormSelecionado] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregandoForms, setCarregandoForms] = useState(true);

  useEffect(() => {
    if (isOpen) {
      buscarFormularios();
    }
  }, [isOpen]);

  const buscarFormularios = async () => {
    setCarregandoForms(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from("forms")
        .select("id, title, description")
        .eq("id_em", userId);

      if (error) throw error;
      setFormularios(data || []);
    } catch (err: any) {
      alert("Erro ao buscar questionários: " + err.message);
    } finally {
      setCarregandoForms(false);
    }
  };

  const enviarParaCandidato = async () => {
    if (!formSelecionado) {
      alert("Selecione um questionário para enviar.");
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 1. Regista o convite na tabela form_invites
      const { error: inviteErr } = await supabase.from("form_invites").insert([
        {
          form_id: formSelecionado,
          id_em: userId,
          id_ja: idJovemAprendiz,
          status: "pendente",
        },
      ]);

      if (inviteErr) throw inviteErr;

      // 2. Envia mensagem automática no chat do candidato com o link
      const linkForm = `/responderPreEntrevista/${formSelecionado}`;
      const mensagemTexto = `Olá! Convidamos você a responder à nossa Pré-Entrevista. Acesse o link: ${linkForm}`;

      await supabase.from("mensagens").insert([
        {
          id_em: userId,
          id_ja: idJovemAprendiz,
          conteudo: mensagemTexto,
          enviado_por_jovem: false,
          lida: false,
        },
      ]);

      alert(`Pré-Entrevista enviada com sucesso para ${nomeCandidato}!`);
      onClose();
    } catch (err: any) {
      alert("Erro ao enviar pré-entrevista: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#1e1b2e",
          padding: 24,
          borderRadius: 12,
          width: "90%",
          maxWidth: 450,
          color: "#fff",
          border: "1px solid #332750",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 20 }}>
          Enviar Pré-Entrevista para {nomeCandidato}
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          Selecione qual formulário deseja enviar para este candidato:
        </p>

        {carregandoForms ? (
          <p style={{ color: "#a855f7" }}>Carregando formulários...</p>
        ) : formularios.length === 0 ? (
          <p style={{ color: "#ef4444" }}>
            Você ainda não criou nenhuma Pré-Entrevista. Crie uma na aba "Pré-Entrevistas" no menu lateral.
          </p>
        ) : (
          <select
            value={formSelecionado}
            onChange={(e) => setFormSelecionado(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#130e21",
              color: "#fff",
              border: "1px solid #332750",
              margin: "16px 0",
              outline: "none",
            }}
          >
            <option value="">-- Escolha a Pré-Entrevista --</option>
            {formularios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #475569",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviarParaCandidato}
            disabled={loading || formularios.length === 0}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(90deg, #9333ea, #7c3aed)",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading ? "Enviando..." : "Enviar Convite"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEnviarPreEntrevista;