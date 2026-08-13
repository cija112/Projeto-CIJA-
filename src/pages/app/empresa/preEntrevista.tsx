import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import styles from "./preEntrevista.module.css";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

interface Pergunta {
  id?: string;
  created_at?: string;
  form_id?: string;
  question_text: string;
  type: string;
  options: string[];
}

interface Formulario {
  id: string;
  id_em: string;
  created_at: string;
  title: string;
  description: string;
  questions?: Pergunta[];
}

const TIPOS_PERGUNTA = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "radio", label: "Escolha única" },
  { value: "select", label: "Lista de opções" },
  { value: "checkbox", label: "Múltipla escolha" },
];

export const PreEntrevistas: React.FC = () => {
  useDocumentTitle("CIJA - Pré-Entrevistas");

  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingForm, setEditingForm] = useState<Formulario | null>(null);
  const [formParaExcluir, setFormParaExcluir] =
    useState<Formulario | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);

  useEffect(() => {
    buscarUsuario();
  }, []);

  async function buscarUsuario() {
    try {
      setLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("Usuário não encontrado.");
        return;
      }

      setUserId(user.id);
      await carregarFormularios(user.id);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
    } finally {
      setLoading(false);
    }
  }

  async function carregarFormularios(empresaId: string) {
    try {
      const { data: forms, error: formsError } = await supabase
        .from("forms")
        .select("*")
        .eq("id_em", empresaId)
        .order("created_at", { ascending: false });

      if (formsError) {
        throw formsError;
      }

      if (!forms) {
        setFormularios([]);
        return;
      }

      const formsComPerguntas: Formulario[] = [];

      for (const form of forms) {
        const { data: questions, error: questionsError } = await supabase
          .from("form_questions")
          .select("*")
          .eq("form_id", form.id)
          .order("created_at", { ascending: true });

        if (questionsError) {
          throw questionsError;
        }

        formsComPerguntas.push({
          ...form,
          questions: (questions || []).map((question) => ({
            ...question,
            options: Array.isArray(question.options)
              ? question.options
              : [],
          })),
        });
      }

      setFormularios(formsComPerguntas);
    } catch (error) {
      console.error("Erro ao carregar pré-entrevistas:", error);
    }
  }

  function abrirModal(formulario: Formulario | null = null) {
    if (formulario) {
      setEditingForm(formulario);
      setTitle(formulario.title);
      setDescription(formulario.description);

      setPerguntas(
        formulario.questions?.map((question) => ({
          id: question.id,
          created_at: question.created_at,
          form_id: question.form_id,
          question_text: question.question_text,
          type: question.type,
          options: question.options || [],
        })) || []
      );
    } else {
      setEditingForm(null);
      setTitle("");
      setDescription("");

      setPerguntas([
        {
          question_text: "",
          type: "text",
          options: [],
        },
      ]);
    }

    setIsModalOpen(true);
  }

  function fecharModal() {
    setIsModalOpen(false);
    setEditingForm(null);
    setTitle("");
    setDescription("");
    setPerguntas([]);
  }

  function adicionarPergunta() {
    setPerguntas((prev) => [
      ...prev,
      {
        question_text: "",
        type: "text",
        options: [],
      },
    ]);
  }

  function removerPergunta(index: number) {
    setPerguntas((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarPergunta(
    index: number,
    campo: keyof Pergunta,
    valor: any
  ) {
    setPerguntas((prev) =>
      prev.map((pergunta, i) => {
        if (i !== index) return pergunta;

        return {
          ...pergunta,
          [campo]: valor,
        };
      })
    );
  }

  function alterarTipoPergunta(index: number, tipo: string) {
    setPerguntas((prev) =>
      prev.map((pergunta, i) => {
        if (i !== index) return pergunta;

        const precisaOpcoes =
          tipo === "radio" ||
          tipo === "select" ||
          tipo === "checkbox";

        return {
          ...pergunta,
          type: tipo,
          options: precisaOpcoes
            ? pergunta.options.length > 0
              ? pergunta.options
              : ["", ""]
            : [],
        };
      })
    );
  }

  function adicionarOpcao(perguntaIndex: number) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;

        return {
          ...pergunta,
          options: [...pergunta.options, ""],
        };
      })
    );
  }

  function removerOpcao(perguntaIndex: number, opcaoIndex: number) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;

        return {
          ...pergunta,
          options: pergunta.options.filter(
            (_, indexOpcao) => indexOpcao !== opcaoIndex
          ),
        };
      })
    );
  }

  function atualizarOpcao(
    perguntaIndex: number,
    opcaoIndex: number,
    valor: string
  ) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;

        return {
          ...pergunta,
          options: pergunta.options.map((opcao, indexOpcao) =>
            indexOpcao === opcaoIndex ? valor : opcao
          ),
        };
      })
    );
  }

  function validarFormulario() {
    if (!title.trim()) {
      alert("Digite o título da pré-entrevista.");
      return false;
    }

    if (!description.trim()) {
      alert("Digite uma descrição para a pré-entrevista.");
      return false;
    }

    if (perguntas.length === 0) {
      alert("Adicione pelo menos uma pergunta.");
      return false;
    }

    for (let i = 0; i < perguntas.length; i++) {
      const pergunta = perguntas[i];

      if (!pergunta.question_text.trim()) {
        alert(`Digite o texto da pergunta ${i + 1}.`);
        return false;
      }

      const precisaOpcoes =
        pergunta.type === "radio" ||
        pergunta.type === "select" ||
        pergunta.type === "checkbox";

      if (precisaOpcoes) {
        const opcoesValidas = pergunta.options.filter(
          (opcao) => opcao.trim() !== ""
        );

        if (opcoesValidas.length < 2) {
          alert(
            `A pergunta ${i + 1} precisa ter pelo menos duas opções.`
          );
          return false;
        }
      }
    }

    return true;
  }

  async function salvarFormulario(e: React.FormEvent) {
    e.preventDefault();

    if (!validarFormulario()) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Sessão expirada. Faça login novamente.");
        return;
      }

      let formId = editingForm?.id;

      if (!editingForm) {
        const { data: novoForm, error: formError } = await supabase
          .from("forms")
          .insert([
            {
              id_em: user.id,
              title: title.trim(),
              description: description.trim(),
            },
          ])
          .select()
          .single();

        if (formError) throw formError;

        formId = novoForm.id;
      } else {
        const { error: formError } = await supabase
          .from("forms")
          .update({
            title: title.trim(),
            description: description.trim(),
          })
          .eq("id", editingForm.id)
          .eq("id_em", user.id);

        if (formError) throw formError;
      }

      if (!formId) {
        throw new Error("Não foi possível identificar o formulário.");
      }

      if (editingForm) {
        const { error: deleteQuestionsError } = await supabase
          .from("form_questions")
          .delete()
          .eq("form_id", formId);

        if (deleteQuestionsError) {
          throw deleteQuestionsError;
        }
      }

      const perguntasParaInserir = perguntas.map((pergunta) => {
        const precisaOpcoes =
          pergunta.type === "radio" ||
          pergunta.type === "select" ||
          pergunta.type === "checkbox";

        return {
          form_id: formId,
          question_text: pergunta.question_text.trim(),
          type: pergunta.type,
          options: precisaOpcoes
            ? pergunta.options
                .filter((opcao) => opcao.trim() !== "")
                .map((opcao) => opcao.trim())
            : [],
        };
      });

      const { error: questionsError } = await supabase
        .from("form_questions")
        .insert(perguntasParaInserir);

      if (questionsError) {
        throw questionsError;
      }

      alert(
        editingForm
          ? "Pré-entrevista atualizada com sucesso!"
          : "Pré-entrevista criada com sucesso!"
      );

      fecharModal();
      await carregarFormularios(user.id);
    } catch (error: any) {
      console.error("Erro ao salvar pré-entrevista:", error);

      alert(
        `Não foi possível salvar a pré-entrevista: ${
          error.message || "Erro desconhecido"
        }`
      );
    }
  }

  async function excluirFormulario() {
    if (!formParaExcluir) return;

    try {
      const { error } = await supabase
        .from("forms")
        .delete()
        .eq("id", formParaExcluir.id)
        .eq("id_em", userId);

      if (error) throw error;

      alert("Pré-entrevista excluída com sucesso!");

      setFormParaExcluir(null);
      setIsDeleteModalOpen(false);

      await carregarFormularios(userId);
    } catch (error: any) {
      console.error("Erro ao excluir formulário:", error);

      alert(
        `Não foi possível excluir a pré-entrevista: ${
          error.message || "Erro desconhecido"
        }`
      );
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <SidebarEmpresa />

        <div className={styles.mainWrapper}>
          <main className={styles.content}>
            <div className={styles.loading}>
              Carregando pré-entrevistas...
            </div>
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
          <div className={styles.headerArea}>
            <div className={styles.headerText}>
              <h1>Pré-Entrevistas</h1>

              <p>
                Crie questionários para avaliar candidatos antes da
                entrevista.
              </p>
            </div>

            <button
              type="button"
              className={styles.btnCriar}
              onClick={() => abrirModal()}
            >
              + Criar Pré-Entrevista
            </button>
          </div>

          <div className={styles.formsSection}>
            {formularios.length === 0 ? (
              <div className={styles.semFormularios}>
                <div className={styles.emptyIcon}>+</div>

                <h2>Nenhuma pré-entrevista criada</h2>

                <p>
                  Crie sua primeira pré-entrevista para começar a
                  avaliar candidatos.
                </p>

                <button
                  type="button"
                  className={styles.btnCriar}
                  onClick={() => abrirModal()}
                >
                  + Criar Pré-Entrevista
                </button>
              </div>
            ) : (
              <>
                <div className={styles.listHeader}>
                  <div>
                    <h2>Suas pré-entrevistas</h2>

                    <span>
                      {formularios.length}{" "}
                      {formularios.length === 1
                        ? "pré-entrevista cadastrada"
                        : "pré-entrevistas cadastradas"}
                    </span>
                  </div>
                </div>

                <div className={styles.formsGrid}>
                  {formularios.map((formulario) => (
                    <div
                      key={formulario.id}
                      className={styles.formCard}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitleArea}>
                          <h2>{formulario.title}</h2>

                          <span className={styles.dataTag}>
                            Criada em{" "}
                            {new Date(
                              formulario.created_at
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      <p className={styles.description}>
                        {formulario.description}
                      </p>

                      <div className={styles.formInfo}>
                        <span>
                          {formulario.questions?.length || 0}{" "}
                          {formulario.questions?.length === 1
                            ? "pergunta"
                            : "perguntas"}
                        </span>
                      </div>

                      <div className={styles.questionsPreview}>
                        {formulario.questions
                          ?.slice(0, 3)
                          .map((pergunta, index) => (
                            <div
                              key={pergunta.id || index}
                              className={styles.questionPreview}
                            >
                              <span>{index + 1}</span>

                              <p>
                                {pergunta.question_text}
                              </p>
                            </div>
                          ))}

                        {(formulario.questions?.length || 0) > 3 && (
                          <span className={styles.moreQuestions}>
                            +{" "}
                            {(formulario.questions?.length || 0) -
                              3}{" "}
                            perguntas
                          </span>
                        )}
                      </div>

                      <div className={styles.acoesArea}>
                        <button
                          type="button"
                          className={styles.btnEditar}
                          onClick={() => abrirModal(formulario)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className={styles.btnExcluir}
                          onClick={() => {
                            setFormParaExcluir(formulario);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {isModalOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                  <div>
                    <h2>
                      {editingForm
                        ? "Editar Pré-Entrevista"
                        : "Criar Pré-Entrevista"}
                    </h2>

                    <p>
                      Configure o questionário que será apresentado
                      aos candidatos.
                    </p>
                  </div>

                  <button
                    className={styles.btnFechar}
                    type="button"
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={salvarFormulario}
                  className={styles.formulario}
                >
                  <div className={styles.inputGroup}>
                    <label>Título da Pré-Entrevista</label>

                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Pré-entrevista - Desenvolvedor"
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Descrição</label>

                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                      placeholder="Explique ao candidato o objetivo desta pré-entrevista..."
                      rows={4}
                      maxLength={1000}
                      required
                    />

                    <span className={styles.contador}>
                      {description.length} / 1000
                    </span>
                  </div>

                  <div className={styles.questionsHeader}>
                    <div>
                      <h3>Perguntas</h3>

                      <p>
                        Adicione as perguntas que deseja fazer aos
                        candidatos.
                      </p>
                    </div>

                    <button
                      type="button"
                      className={styles.btnAdicionarPergunta}
                      onClick={adicionarPergunta}
                    >
                      + Adicionar Pergunta
                    </button>
                  </div>

                  <div className={styles.questionsList}>
                    {perguntas.map((pergunta, index) => {
                      const possuiOpcoes =
                        pergunta.type === "radio" ||
                        pergunta.type === "select" ||
                        pergunta.type === "checkbox";

                      return (
                        <div
                          key={pergunta.id || index}
                          className={styles.questionCard}
                        >
                          <div className={styles.questionTop}>
                            <div className={styles.questionNumber}>
                              {index + 1}
                            </div>

                            <button
                              type="button"
                              className={styles.btnRemoverPergunta}
                              onClick={() =>
                                removerPergunta(index)
                              }
                            >
                              Excluir
                            </button>
                          </div>

                          <div className={styles.inputGroup}>
                            <label>Pergunta</label>

                            <input
                              type="text"
                              value={pergunta.question_text}
                              onChange={(e) =>
                                atualizarPergunta(
                                  index,
                                  "question_text",
                                  e.target.value
                                )
                              }
                              placeholder="Digite a pergunta..."
                              required
                            />
                          </div>

                          <div className={styles.inputGroup}>
                            <label>Tipo de resposta</label>

                            <select
                              value={pergunta.type}
                              onChange={(e) =>
                                alterarTipoPergunta(
                                  index,
                                  e.target.value
                                )
                              }
                            >
                              {TIPOS_PERGUNTA.map((tipo) => (
                                <option
                                  key={tipo.value}
                                  value={tipo.value}
                                >
                                  {tipo.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {possuiOpcoes && (
                            <div className={styles.optionsArea}>
                              <div className={styles.optionsHeader}>
                                <label>
                                  Opções de resposta
                                </label>

                                <button
                                  type="button"
                                  onClick={() =>
                                    adicionarOpcao(index)
                                  }
                                  className={
                                    styles.btnAdicionarOpcao
                                  }
                                >
                                  + Adicionar opção
                                </button>
                              </div>

                              {pergunta.options.map(
                                (opcao, opcaoIndex) => (
                                  <div
                                    key={opcaoIndex}
                                    className={styles.optionRow}
                                  >
                                    <span>
                                      {opcaoIndex + 1}.
                                    </span>

                                    <input
                                      type="text"
                                      value={opcao}
                                      onChange={(e) =>
                                        atualizarOpcao(
                                          index,
                                          opcaoIndex,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`Opção ${
                                        opcaoIndex + 1
                                      }`}
                                    />

                                    <button
                                      type="button"
                                      className={
                                        styles.btnRemoverOpcao
                                      }
                                      onClick={() =>
                                        removerOpcao(
                                          index,
                                          opcaoIndex
                                        )
                                      }
                                    >
                                      ×
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.modalAcoes}>
                    <button
                      type="button"
                      className={styles.btnCancelar}
                      onClick={fecharModal}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className={styles.btnSalvar}
                    >
                      {editingForm
                        ? "Salvar Alterações"
                        : "Criar Pré-Entrevista"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isDeleteModalOpen && formParaExcluir && (
            <div className={styles.modalOverlay}>
              <div
                className={`${styles.modalContainer} ${styles.modalDelete}`}
              >
                <h3>Excluir Pré-Entrevista</h3>

                <p>
                  Você tem certeza que deseja excluir a
                  pré-entrevista{" "}
                  <strong>{formParaExcluir.title}</strong>?
                </p>

                <p className={styles.warning}>
                  Todas as perguntas associadas também serão
                  excluídas. Esta ação não poderá ser desfeita.
                </p>

                <div className={styles.modalAcoes}>
                  <button
                    type="button"
                    className={styles.btnCancelar}
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setFormParaExcluir(null);
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className={styles.btnConfirmarDeletar}
                    onClick={excluirFormulario}
                  >
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PreEntrevistas;