import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import styles from "./preEntrevistasJovem.module.css";
import { Sidebar } from "../../../components/sideBar/sideBar";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

interface Pergunta {
  id: string;
  created_at?: string;
  form_id: string;
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
  questions: Pergunta[];
}

interface FormInvite {
  id: string;
  created_at: string;
  form_id: string;
  id_em: string;
  id_ja: string;
  status: string;
}

interface FormResponse {
  id: string;
  created_at: string;
  form_id: string;
  user_id: string;
  answers: Record<string, any>;
}

export const PreEntrevistasJovem: React.FC = () => {
  useDocumentTitle("CIJA - Minhas Pré-Entrevistas");

  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [respostas, setRespostas] = useState<
    Record<string, FormResponse>
  >({});

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [userId, setUserId] = useState("");

  const [formularioSelecionado, setFormularioSelecionado] =
    useState<Formulario | null>(null);

  const [respostasAtuais, setRespostasAtuais] = useState<
    Record<string, any>
  >({});

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Usuário não encontrado.");
        return;
      }

      setUserId(user.id);

      /*
       * Busca somente os convites desse Jovem Aprendiz.
       */
      const { data: invites, error: invitesError } = await supabase
        .from("form_invites")
        .select("*")
        .eq("id_ja", user.id)
        .order("created_at", { ascending: false });

      if (invitesError) {
        throw invitesError;
      }

      if (!invites || invites.length === 0) {
        setFormularios([]);
        setRespostas({});
        return;
      }

      /*
       * Remove possíveis convites duplicados para
       * o mesmo formulário.
       */
      const invitesUnicos = Array.from(
        new Map(
          invites.map((invite) => [invite.form_id, invite])
        ).values()
      ) as FormInvite[];

      const formIds = invitesUnicos.map(
        (invite) => invite.form_id
      );

      /*
       * Busca somente os formulários para os quais
       * esse jovem possui convite.
       */
      const { data: forms, error: formsError } = await supabase
        .from("forms")
        .select("*")
        .in("id", formIds)
        .order("created_at", { ascending: false });

      if (formsError) {
        throw formsError;
      }

      if (!forms || forms.length === 0) {
        setFormularios([]);
        setRespostas({});
        return;
      }

      /*
       * Busca as perguntas de todos os formulários.
       */
      const { data: questions, error: questionsError } =
        await supabase
          .from("form_questions")
          .select("*")
          .in("form_id", formIds)
          .order("created_at", { ascending: true });

      if (questionsError) {
        throw questionsError;
      }

      const formsComPerguntas: Formulario[] = forms.map(
        (form) => ({
          ...form,
          questions: (questions || [])
            .filter((question) => question.form_id === form.id)
            .map((question) => ({
              ...question,
              options: Array.isArray(question.options)
                ? question.options
                : [],
            })),
        })
      );

      /*
       * Busca as respostas desse jovem para esses formulários.
       */
      const { data: responses, error: responsesError } =
        await supabase
          .from("form_responses")
          .select("*")
          .eq("user_id", user.id)
          .in("form_id", formIds);

      if (responsesError) {
        throw responsesError;
      }

      const respostasMap: Record<string, FormResponse> = {};

      (responses || []).forEach((response) => {
        respostasMap[response.form_id] = response;
      });

      setFormularios(formsComPerguntas);
      setRespostas(respostasMap);
    } catch (error) {
      console.error(
        "Erro ao carregar pré-entrevistas:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function abrirFormulario(formulario: Formulario) {
    setFormularioSelecionado(formulario);

    const respostaExistente = respostas[formulario.id];

    if (respostaExistente) {
      setRespostasAtuais(
        respostaExistente.answers || {}
      );
    } else {
      setRespostasAtuais({});
    }

    setIsModalOpen(true);
  }

  function fecharFormulario() {
    if (salvando) return;

    setIsModalOpen(false);
    setFormularioSelecionado(null);
    setRespostasAtuais({});
  }

  function atualizarResposta(
    perguntaId: string,
    valor: any
  ) {
    setRespostasAtuais((prev) => ({
      ...prev,
      [perguntaId]: valor,
    }));
  }

  function atualizarCheckbox(
    perguntaId: string,
    opcao: string,
    checked: boolean
  ) {
    setRespostasAtuais((prev) => {
      const respostasAtuais = Array.isArray(
        prev[perguntaId]
      )
        ? prev[perguntaId]
        : [];

      if (checked) {
        return {
          ...prev,
          [perguntaId]: [
            ...respostasAtuais,
            opcao,
          ],
        };
      }

      return {
        ...prev,
        [perguntaId]: respostasAtuais.filter(
          (item: string) => item !== opcao
        ),
      };
    });
  }

  function validarRespostas() {
    if (!formularioSelecionado) return false;

    for (const pergunta of formularioSelecionado.questions) {
      const resposta = respostasAtuais[pergunta.id];

      if (
        resposta === undefined ||
        resposta === null ||
        resposta === "" ||
        (Array.isArray(resposta) && resposta.length === 0)
      ) {
        alert(
          `Responda a pergunta: "${pergunta.question_text}"`
        );

        return false;
      }
    }

    return true;
  }

  async function enviarRespostas(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!formularioSelecionado) return;

    if (!validarRespostas()) return;

    try {
      setSalvando(true);

      /*
       * Segurança: verifica novamente o usuário
       * autenticado antes de salvar.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert(
          "Sua sessão expirou. Faça login novamente."
        );
        return;
      }

      /*
       * Impede que o formulário seja enviado novamente
       * caso já exista uma resposta.
       */
      const { data: respostaExistente, error: buscaError } =
        await supabase
          .from("form_responses")
          .select("id")
          .eq("form_id", formularioSelecionado.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (buscaError) {
        throw buscaError;
      }

      if (respostaExistente) {
        alert(
          "Você já respondeu esta pré-entrevista."
        );

        await carregarDados();
        fecharFormulario();

        return;
      }

      /*
       * answers será armazenado como JSONB:
       *
       * {
       *   "id-da-pergunta-1": "Resposta",
       *   "id-da-pergunta-2": ["Opção 1", "Opção 2"]
       * }
       */
      const { data: novaResposta, error } =
        await supabase
          .from("form_responses")
          .insert([
            {
              form_id: formularioSelecionado.id,
              user_id: user.id,
              answers: respostasAtuais,
            },
          ])
          .select()
          .single();

      if (error) {
        throw error;
      }

      if (novaResposta) {
        setRespostas((prev) => ({
          ...prev,
          [formularioSelecionado.id]: novaResposta,
        }));
      }

      alert(
        "Pré-entrevista respondida com sucesso!"
      );

      fecharFormulario();
      await carregarDados();
    } catch (error: any) {
      console.error(
        "Erro ao salvar respostas:",
        error
      );

      alert(
        `Não foi possível enviar suas respostas: ${
          error.message || "Erro desconhecido"
        }`
      );
    } finally {
      setSalvando(false);
    }
  }

  function renderPergunta(pergunta: Pergunta) {
    const resposta =
      respostasAtuais[pergunta.id];

    switch (pergunta.type) {
      case "textarea":
        return (
          <textarea
            value={resposta || ""}
            onChange={(e) =>
              atualizarResposta(
                pergunta.id,
                e.target.value
              )
            }
            placeholder="Digite sua resposta..."
            rows={5}
            disabled={Boolean(
              respostas[formularioSelecionado?.id || ""]
            )}
          />
        );

      case "radio":
        return (
          <div className={styles.opcoesResposta}>
            {pergunta.options.map((opcao, index) => (
              <label
                key={`${opcao}-${index}`}
                className={styles.opcaoResposta}
              >
                <input
                  type="radio"
                  name={`pergunta-${pergunta.id}`}
                  value={opcao}
                  checked={resposta === opcao}
                  onChange={() =>
                    atualizarResposta(
                      pergunta.id,
                      opcao
                    )
                  }
                  disabled={Boolean(
                    respostas[
                      formularioSelecionado?.id || ""
                    ]
                  )}
                />

                <span>{opcao}</span>
              </label>
            ))}
          </div>
        );

      case "select":
        return (
          <select
            value={resposta || ""}
            onChange={(e) =>
              atualizarResposta(
                pergunta.id,
                e.target.value
              )
            }
            disabled={Boolean(
              respostas[formularioSelecionado?.id || ""]
            )}
          >
            <option value="">
              Selecione uma opção
            </option>

            {pergunta.options.map((opcao, index) => (
              <option
                key={`${opcao}-${index}`}
                value={opcao}
              >
                {opcao}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <div className={styles.opcoesResposta}>
            {pergunta.options.map((opcao, index) => {
              const selecionadas = Array.isArray(
                resposta
              )
                ? resposta
                : [];

              return (
                <label
                  key={`${opcao}-${index}`}
                  className={styles.opcaoResposta}
                >
                  <input
                    type="checkbox"
                    value={opcao}
                    checked={selecionadas.includes(
                      opcao
                    )}
                    onChange={(e) =>
                      atualizarCheckbox(
                        pergunta.id,
                        opcao,
                        e.target.checked
                      )
                    }
                    disabled={Boolean(
                      respostas[
                        formularioSelecionado?.id || ""
                      ]
                    )}
                  />

                  <span>{opcao}</span>
                </label>
              );
            })}
          </div>
        );

      case "text":
      default:
        return (
          <input
            type="text"
            value={resposta || ""}
            onChange={(e) =>
              atualizarResposta(
                pergunta.id,
                e.target.value
              )
            }
            placeholder="Digite sua resposta..."
            disabled={Boolean(
              respostas[formularioSelecionado?.id || ""]
            )}
          />
        );
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <Sidebar />

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
      <Sidebar />

      <div className={styles.mainWrapper}>
        <main className={styles.content}>
          <div className={styles.headerArea}>
            <div className={styles.headerText}>
              <h1>Minhas Pré-Entrevistas</h1>

              <p>
                Responda às pré-entrevistas enviadas pelas
                empresas.
              </p>
            </div>
          </div>

          <div className={styles.formsSection}>
            {formularios.length === 0 ? (
              <div className={styles.semFormularios}>
                <div className={styles.emptyIcon}>
                  ✓
                </div>

                <h2>
                  Nenhuma pré-entrevista disponível
                </h2>

                <p>
                  No momento você não possui nenhuma
                  pré-entrevista enviada por uma empresa.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.listHeader}>
                  <div>
                    <h2>
                      Pré-entrevistas disponíveis
                    </h2>

                    <span>
                      {formularios.length}{" "}
                      {formularios.length === 1
                        ? "pré-entrevista"
                        : "pré-entrevistas"}
                    </span>
                  </div>
                </div>

                <div className={styles.formsGrid}>
                  {formularios.map((formulario) => {
                    const resposta =
                      respostas[formulario.id];

                    return (
                      <div
                        key={formulario.id}
                        className={styles.formCard}
                      >
                        <div
                          className={styles.cardHeader}
                        >
                          <div
                            className={
                              styles.cardTitleArea
                            }
                          >
                            <h2>
                              {formulario.title}
                            </h2>

                            <span
                              className={
                                styles.dataTag
                              }
                            >
                              Enviada em{" "}
                              {new Date(
                                formulario.created_at
                              ).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          </div>
                        </div>

                        <p
                          className={
                            styles.description
                          }
                        >
                          {formulario.description}
                        </p>

                        <div
                          className={styles.formInfo}
                        >
                          <span>
                            {formulario.questions.length}{" "}
                            {formulario.questions.length ===
                            1
                              ? "pergunta"
                              : "perguntas"}
                          </span>

                          {resposta && (
                            <span
                              className={
                                styles.respondido
                              }
                            >
                              Respondida
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            styles.questionsPreview
                          }
                        >
                          {formulario.questions
                            .slice(0, 3)
                            .map(
                              (pergunta, index) => (
                                <div
                                  key={pergunta.id}
                                  className={
                                    styles.questionPreview
                                  }
                                >
                                  <span>
                                    {index + 1}
                                  </span>

                                  <p>
                                    {
                                      pergunta.question_text
                                    }
                                  </p>
                                </div>
                              )
                            )}

                          {formulario.questions
                            .length > 3 && (
                            <span
                              className={
                                styles.moreQuestions
                              }
                            >
                              +
                              {formulario.questions
                                .length - 3}{" "}
                              perguntas
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            styles.acoesArea
                          }
                        >
                          <button
                            type="button"
                            className={
                              resposta
                                ? styles.btnVisualizar
                                : styles.btnResponder
                            }
                            onClick={() =>
                              abrirFormulario(
                                formulario
                              )
                            }
                          >
                            {resposta
                              ? "Visualizar respostas"
                              : "Responder"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {isModalOpen &&
            formularioSelecionado && (
              <div className={styles.modalOverlay}>
                <div
                  className={
                    styles.modalContainer
                  }
                >
                  <div
                    className={
                      styles.modalHeader
                    }
                  >
                    <div>
                      <h2>
                        {
                          formularioSelecionado.title
                        }
                      </h2>

                      <p>
                        {
                          formularioSelecionado.description
                        }
                      </p>
                    </div>

                    <button
                      className={
                        styles.btnFechar
                      }
                      type="button"
                      onClick={
                        fecharFormulario
                      }
                    >
                      ×
                    </button>
                  </div>

                  {respostas[
                    formularioSelecionado.id
                  ] && (
                    <div
                      className={
                        styles.avisoRespondido
                      }
                    >
                      <strong>
                        Pré-entrevista respondida
                      </strong>

                      <span>
                        Você já enviou suas respostas
                        para esta pré-entrevista.
                      </span>
                    </div>
                  )}

                  <form
                    onSubmit={enviarRespostas}
                    className={
                      styles.formulario
                    }
                  >
                    <div
                      className={
                        styles.questionsList
                      }
                    >
                      {formularioSelecionado.questions.map(
                        (pergunta, index) => (
                          <div
                            key={pergunta.id}
                            className={
                              styles.questionCard
                            }
                          >
                            <div
                              className={
                                styles.questionTop
                              }
                            >
                              <div
                                className={
                                  styles.questionNumber
                                }
                              >
                                {index + 1}
                              </div>
                            </div>

                            <div
                              className={
                                styles.perguntaTexto
                              }
                            >
                              <label>
                                {
                                  pergunta.question_text
                                }
                              </label>
                            </div>

                            <div
                              className={
                                styles.respostaArea
                              }
                            >
                              {renderPergunta(
                                pergunta
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div
                      className={
                        styles.modalAcoes
                      }
                    >
                      <button
                        type="button"
                        className={
                          styles.btnCancelar
                        }
                        onClick={
                          fecharFormulario
                        }
                      >
                        Fechar
                      </button>

                      {!respostas[
                        formularioSelecionado.id
                      ] && (
                        <button
                          type="submit"
                          className={
                            styles.btnSalvar
                          }
                          disabled={salvando}
                        >
                          {salvando
                            ? "Enviando..."
                            : "Enviar respostas"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default PreEntrevistasJovem;
