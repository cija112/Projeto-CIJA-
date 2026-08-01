import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";

interface Pergunta {
  id: string;
  question_text: string;
  type: "texto" | "escolha";
  options: string[];
}

export const ResponderPreEntrevista: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarFormulario();
  }, [formId]);

  const carregarFormulario = async () => {
    try {
      // Carregar dados do formulário
      const { data: form, error: formErr } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (formErr) throw formErr;

      setTitulo(form.title);
      setDescricao(form.description);

      // Carregar perguntas
      const { data: questions, error: qErr } = await supabase
        .from("form_questions")
        .select("*")
        .eq("form_id", formId);

      if (qErr) throw qErr;

      setPerguntas(questions || []);
    } catch (err: any) {
      alert("Erro ao carregar pré-entrevista: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespostaChange = (questionId: string, valor: string) => {
    setRespostas((prev) => ({ ...prev, [questionId]: valor }));
  };

  const enviarRespostas = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { error } = await supabase.from("form_responses").insert([
        {
          form_id: formId,
          user_id: userId,
          answers: respostas,
        },
      ]);

      if (error) throw error;

      alert("Pré-Entrevista respondida com sucesso!");
      navigate("/vagas");
    } catch (err: any) {
      alert("Erro ao enviar respostas: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <p style={{ color: "#fff" }}>Carregando questionário...</p>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", color: "#fff", padding: 20 }}>
      <h1>{titulo}</h1>
      <p style={{ color: "#94a3b8" }}>{descricao}</p>
      <hr style={{ margin: "20px 0", borderColor: "#334155" }} />

      <form onSubmit={enviarRespostas}>
        {perguntas.map((p, idx) => (
          <div key={p.id} style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
              {idx + 1}. {p.question_text}
            </label>

            {p.type === "texto" ? (
              <textarea
                rows={3}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: "#1e293b",
                  color: "#fff",
                  border: "1px solid #475569",
                }}
                onChange={(e) => handleRespostaChange(p.id, e.target.value)}
                required
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {p.options.map((opt, oIdx) => (
                  <label key={oIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name={`pergunta_${p.id}`}
                      value={opt}
                      onChange={(e) => handleRespostaChange(p.id, e.target.value)}
                      required
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={enviando}
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            width: "100%",
          }}
        >
          {enviando ? "Enviando..." : "Enviar Respostas"}
        </button>
      </form>
    </div>
  );
};

export default ResponderPreEntrevista;