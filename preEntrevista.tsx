import React, { useState, useEffect } from "react";
import styles from "./preEntrevista.module.css";
import SidebarEmpresa from "../../../components/sideBar/sideBarEmpresa";
import { supabase } from "../../../supabaseClient";

interface Pergunta {
  texto: string;
  tipo: "texto" | "escolha";
  opcoes: string[];
}

export const PreEntrevistaEmpresa: React.FC = () => {
  useEffect(() => {
    document.title = "CIJA - Criar Pré-Entrevista";
  }, []);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);

  // Estados da pergunta atual em edição
  const [textoPergunta, setTextoPergunta] = useState("");
  const [tipoResposta, setTipoResposta] = useState<"texto" | "escolha">("texto");
  const [opcaoTexto, setOpcaoTexto] = useState("");
  const [listaOpcoes, setListaOpcoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Adicionar uma nova opção de múltipla escolha
  const adicionarOpcao = () => {
    const textoLimpo = opcaoTexto.trim();
    if (!textoLimpo) return;

    if (listaOpcoes.includes(textoLimpo)) {
      alert("Esta opção já foi adicionada.");
      return;
    }

    setListaOpcoes([...listaOpcoes, textoLimpo]);
    setOpcaoTexto("");
  };

  // Remover uma opção de múltipla escolha pelo índice
  const removerOpcao = (indexParaRemover: number) => {
    setListaOpcoes(listaOpcoes.filter((_, index) => index !== indexParaRemover));
  };

  // Adicionar a pergunta completa à lista
  const adicionarPergunta = () => {
    if (!textoPergunta.trim()) {
      alert("Por favor, digite o texto da pergunta.");
      return;
    }

    if (tipoResposta === "escolha" && listaOpcoes.length < 2) {
      alert("Uma pergunta de múltipla escolha precisa ter pelo menos 2 opções.");
      return;
    }

    setPerguntas([
      ...perguntas,
      {
        texto: textoPergunta.trim(),
        tipo: tipoResposta,
        opcoes: tipoResposta === "escolha" ? listaOpcoes : [],
      },
    ]);

    // Limpar campos após incluir
    setTextoPergunta("");
    setTipoResposta("texto");
    setListaOpcoes([]);
    setOpcaoTexto("");
  };

  const removerPergunta = (index: number) => {
    setPerguntas(perguntas.filter((_, i) => i !== index));
  };

  // Salvar formulário no Supabase
  const salvarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      alert("Informe o título do questionário.");
      return;
    }

    if (perguntas.length === 0) {
      alert("Adicione pelo menos uma pergunta ao questionário.");
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 1. Criar Formulário
      const { data: formData, error: formErr } = await supabase
        .from("forms")
        .insert([{ title: titulo, description: descricao, id_em: userId }])
        .select()
        .single();

      if (formErr) throw formErr;

      // 2. Criar Perguntas
      const payloadPerguntas = perguntas.map((p) => ({
        form_id: formData.id,
        question_text: p.texto,
        type: p.tipo,
        options: p.opcoes,
      }));

      const { error: qErr } = await supabase
        .from("form_questions")
        .insert(payloadPerguntas);

      if (qErr) throw qErr;

      alert("Pré-Entrevista salva com sucesso!");
      setTitulo("");
      setDescricao("");
      setPerguntas([]);
    } catch (err: any) {
      alert("Erro ao salvar questionário: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <SidebarEmpresa />
      <div className={styles.mainWrapper}>
        <main className={styles.content}>
          <div className={styles.headerArea}>
            <h1>Criar Pré-Entrevista</h1>
            <p>Monte o questionário de seleção para avaliar os candidatos</p>
          </div>

          <form className={styles.cardForm} onSubmit={salvarFormulario}>
            {/* Dados do Formulário */}
            <div className={styles.formGroup}>
              <label>Título do Questionário</label>
              <input
                className={styles.inputField}
                type="text"
                placeholder="Ex: Pré-Seleção - Auxiliar Administrativo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Descrição / Instruções</label>
              <textarea
                className={styles.textareaField}
                rows={3}
                placeholder="Ex: Responda a todas as questões com atenção..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <hr className={styles.sectionDivider} />

            {/* Criador de Pergunta */}
            <div className={styles.boxAdicionarPergunta}>
              <h3>+ Nova Pergunta</h3>

              <div className={styles.formGroup}>
                <label>Pergunta</label>
                <input
                  className={styles.inputField}
                  type="text"
                  placeholder="Ex: Qual seu nível de experiência com Pacote Office?"
                  value={textoPergunta}
                  onChange={(e) => setTextoPergunta(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tipo de Resposta</label>
                <select
                  className={styles.selectField}
                  value={tipoResposta}
                  onChange={(e) => {
                    setTipoResposta(e.target.value as "texto" | "escolha");
                    setListaOpcoes([]);
                  }}
                >
                  <option value="texto">Texto Livre (Dissertativa)</option>
                  <option value="escolha">Múltipla Escolha</option>
                </select>
              </div>

              {/* Seção Exclusiva de Múltipla Escolha */}
              {tipoResposta === "escolha" && (
                <div className={styles.formGroup}>
                  <label>Opções de Resposta</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      className={styles.inputField}
                      type="text"
                      placeholder="Ex: Intermediário (adicione e aperte Enter)"
                      value={opcaoTexto}
                      onChange={(e) => setOpcaoTexto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          adicionarOpcao();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.btnAdd}
                      onClick={adicionarOpcao}
                    >
                      + Adicionar
                    </button>
                  </div>

                  {/* Lista de Opções adicionadas com botão de excluir */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginTop: "12px",
                    }}
                  >
                    {listaOpcoes.map((opcao, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: "#334155",
                          color: "#f8fafc",
                          padding: "6px 12px",
                          borderRadius: "16px",
                          fontSize: "14px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {opcao}
                        <button
                          type="button"
                          onClick={() => removerOpcao(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                className={styles.btnAdd}
                onClick={adicionarPergunta}
                style={{ marginTop: "12px", width: "100%" }}
              >
                Incluir Pergunta no Questionário
              </button>
            </div>

            {/* Pergunta Criadas */}
            {perguntas.length > 0 && (
              <div className={styles.listaPerguntas}>
                <h3>Perguntas Adicionadas ({perguntas.length})</h3>
                {perguntas.map((p, idx) => (
                  <div key={idx} className={styles.itemPergunta}>
                    <div style={{ flex: 1 }}>
                      <strong>
                        {idx + 1}. {p.texto}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "#94a3b8",
                          marginTop: "2px",
                        }}
                      >
                        Tipo: {p.tipo === "texto" ? "Texto Livre" : "Múltipla Escolha"}
                      </span>

                      {/* Renderiza as opções da pergunta se for múltipla escolha */}
                      {p.tipo === "escolha" && (
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginTop: "6px",
                          }}
                        >
                          {p.opcoes.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              style={{
                                backgroundColor: "#1e293b",
                                color: "#cbd5e1",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                border: "1px solid #475569",
                              }}
                            >
                              • {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.btnRemover}
                      onClick={() => removerPergunta(idx)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={styles.btnSalvarPrincipal}
              style={{ marginTop: "24px" }}
            >
              {loading ? "Salvando..." : "Publicar Pré-Entrevista"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default PreEntrevistaEmpresa;