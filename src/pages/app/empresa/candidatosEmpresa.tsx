import React, { useEffect, useState } from "react";
import styles from "./candidatosEmpresa.module.css";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { supabase } from "../../../supabaseClient";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";

interface Vaga {
  id_vag: string;
  titulo: string;
  id_em: string;
}

interface JovemAprendiz {
  id_ja: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  avatar_url?: string | null;
}

interface Curriculo {
  id_ja: string;
  descricao?: string | null;
  competencias?: string | null;
  experiencias?: unknown;
  curso?: unknown;
}

interface CandidaturaBanco {
  id_candidatura: string;
  id_vaga: string;
  id_candidato: string;
  data_candidatura: string;
  status_aprovacao: string | null;
}

interface PerguntaPreEntrevista {
  id: string;
  form_id: string;
  question_text: string;
  type: string;
  options?: string[];
  created_at?: string;
}

interface FormularioPreEntrevista {
  id: string;
  id_em: string;
  title: string;
  description: string;
  created_at: string;
  questions: PerguntaPreEntrevista[];
}

interface FormResponse {
  id: string;
  created_at: string;
  form_id: string;
  user_id: string;
  answers: Record<string, any>;
}

interface Candidatura {
  id_candidatura: string;
  id_vag: string;
  id_candidato: string;
  data_candidatura: string;
  status_aprovacao: string | null;

  vaga: {
    titulo: string;
    id_em: string;
  };

  curriculo: {
    nome: string;
    telefone: string;
    endereco: string;
    email: string;
    descricao: string;
    competencias: string;
    experiencias: string;
    curso: string;
  };

  preEntrevistas: {
    formulario: FormularioPreEntrevista;
    resposta: FormResponse;
  }[];
}

interface Formulario {
  id: string;
  created_at?: string;
}

export const CandidatosEmpresa: React.FC = () => {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);

  const [processandoId, setProcessandoId] =
    useState<string | null>(null);

  const [candidaturaSelecionada, setCandidaturaSelecionada] =
    useState<Candidatura | null>(null);

  const navigate = useNavigate();

  useDocumentTitle("CIJA - Candidatos às suas Vagas");

  useEffect(() => {
    buscarCandidatos();
  }, []);
  function formatarChave(chave: string): string {
    const nomes: Record<string, string> = {
      curso: "Curso",
      instituicao: "Instituição",
      inicio: "Início",
      fim: "Fim",

      empresa: "Empresa",
      cargo: "Cargo",
      funcao: "Função",
      periodo: "Período",
      atividades: "Atividades",

      descricao: "Descrição",
      titulo: "Título",
      local: "Local",
    };

    if (nomes[chave]) {
      return nomes[chave];
    }

    return chave
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letra) =>
        letra.toUpperCase()
      );
  }

  function tentarParseJson(valor: unknown): unknown {
    if (typeof valor !== "string") {
      return valor;
    }

    const texto = valor.trim();

    if (!texto) {
      return "";
    }

    try {
      return JSON.parse(texto);
    } catch {
      return valor;
    }
  }

  function jsonParaTexto(valor: unknown): string {
    if (
      valor === null ||
      valor === undefined
    ) {
      return "";
    }

    const valorProcessado =
      tentarParseJson(valor);

    if (valorProcessado !== valor) {
      return jsonParaTexto(valorProcessado);
    }

    if (typeof valorProcessado === "string") {
      return valorProcessado;
    }

    if (
      typeof valorProcessado === "number" ||
      typeof valorProcessado === "boolean"
    ) {
      return String(valorProcessado);
    }

    if (Array.isArray(valorProcessado)) {
      return valorProcessado
        .map((item) =>
          jsonParaTexto(item)
        )
        .filter(
          (item) =>
            item.trim() !== ""
        )
        .join("\n\n");
    }

    if (
      typeof valorProcessado ===
        "object" &&
      valorProcessado !== null
    ) {
      const objeto =
        valorProcessado as Record<
          string,
          unknown
        >;

      return Object.entries(objeto)
        .map(
          ([chave, valorCampo]) => {
            const texto =
              jsonParaTexto(
                valorCampo
              );

            if (!texto) {
              return "";
            }

            return `${formatarChave(
              chave
            )}: ${texto}`;
          }
        )
        .filter(
          (item) =>
            item.trim() !== ""
        )
        .join("\n");
    }

    return "";
  }

  function formatarCursos(
    valor: unknown
  ): string {
    if (
      valor === null ||
      valor === undefined
    ) {
      return "";
    }

    let dados =
      tentarParseJson(valor);

    if (typeof dados === "string") {
      return dados;
    }

    if (
      typeof dados === "object" &&
      dados !== null &&
      !Array.isArray(dados)
    ) {
      dados = [dados];
    }

    if (!Array.isArray(dados)) {
      return jsonParaTexto(dados);
    }

    return dados
      .map((item: unknown) => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return String(item);
        }

        const curso =
          item as Record<
            string,
            unknown
          >;

        const linhas: string[] = [];

        if (
          curso.curso !==
            undefined &&
          curso.curso !== null &&
          String(curso.curso).trim()
        ) {
          linhas.push(
            `Curso: ${String(
              curso.curso
            )}`
          );
        }

        if (
          curso.instituicao !==
            undefined &&
          curso.instituicao !== null &&
          String(
            curso.instituicao
          ).trim()
        ) {
          linhas.push(
            `Instituição: ${String(
              curso.instituicao
            )}`
          );
        }

        if (
          curso.inicio !==
            undefined &&
          curso.inicio !== null &&
          String(curso.inicio).trim()
        ) {
          linhas.push(
            `Início: ${String(
              curso.inicio
            )}`
          );
        }

        if (
          curso.fim !==
            undefined &&
          curso.fim !== null &&
          String(curso.fim).trim()
        ) {
          linhas.push(
            `Fim: ${String(
              curso.fim
            )}`
          );
        }

        Object.entries(curso).forEach(
          ([chave, valorCampo]) => {
            if (
              [
                "curso",
                "instituicao",
                "inicio",
                "fim",
              ].includes(chave)
            ) {
              return;
            }

            if (
              valorCampo ===
                null ||
              valorCampo ===
                undefined
            ) {
              return;
            }

            const texto =
              jsonParaTexto(
                valorCampo
              );

            if (texto.trim()) {
              linhas.push(
                `${formatarChave(
                  chave
                )}: ${texto}`
              );
            }
          }
        );

        return linhas.join("\n");
      })
      .filter(
        (item) =>
          item.trim() !== ""
      )
      .join("\n\n");
  }

  function formatarRespostaPreEntrevista(
    resposta: any
  ): string {
    if (
      resposta === null ||
      resposta === undefined
    ) {
      return "Não respondido";
    }

    if (Array.isArray(resposta)) {
      if (resposta.length === 0) {
        return "Não respondido";
      }

      return resposta
        .map((item) => String(item))
        .join(", ");
    }

    if (
      typeof resposta === "object"
    ) {
      return jsonParaTexto(
        resposta
      );
    }

    return String(resposta);
  }

  async function buscarCandidatos() {
    try {
      setLoading(true);

      console.log(
        "===================================="
      );

      console.log(
        "BUSCANDO CANDIDATOS"
      );

      console.log(
        "===================================="
      );

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Erro ao obter usuário:",
          userError
        );

        throw userError;
      }

      if (!user) {
        console.log(
          "Nenhum usuário autenticado."
        );

        setCandidaturas([]);

        return;
      }

      console.log(
        "Empresa logada:",
        user.id
      );
      const {
        data: vagasData,
        error: vagasError,
      } = await supabase
        .from("vaga")
        .select(
          "id_vag, titulo, id_em"
        )
        .eq("id_em", user.id);

      if (vagasError) {
        console.error(
          "Erro ao buscar vagas:",
          vagasError
        );

        throw vagasError;
      }

      console.log(
        "Vagas encontradas:",
        vagasData
      );

      if (
        !vagasData ||
        vagasData.length === 0
      ) {
        setCandidaturas([]);

        return;
      }

      const vagas =
        vagasData as Vaga[];

      const idsVagas =
        vagas.map(
          (vaga) =>
            vaga.id_vag
        );
      const {
        data: candidaturasData,
        error: candidaturasError,
      } =
        await supabase
          .from("candidaturas")
          .select(
            `
              id_candidatura,
              id_vaga,
              id_candidato,
              data_candidatura,
              status_aprovacao
            `
          )
          .in(
            "id_vaga",
            idsVagas
          )
          .order(
            "data_candidatura",
            {
              ascending: false,
            }
          );

      if (candidaturasError) {
        console.error(
          "Erro ao buscar candidaturas:",
          candidaturasError
        );

        throw candidaturasError;
      }

      console.log(
        "Candidaturas encontradas:",
        candidaturasData
      );

      if (
        !candidaturasData ||
        candidaturasData.length === 0
      ) {
        setCandidaturas([]);

        return;
      }

      const candidaturas =
        candidaturasData as CandidaturaBanco[];

      const idsCandidatos: string[] =
        [];

      candidaturas.forEach(
        (candidatura) => {
          if (
            candidatura.id_candidato &&
            idsCandidatos.indexOf(
              candidatura.id_candidato
            ) === -1
          ) {
            idsCandidatos.push(
              candidatura.id_candidato
            );
          }
        }
      );

      console.log(
        "IDs dos candidatos:",
        idsCandidatos
      );
      const {
        data: jovensData,
        error: jovensError,
      } =
        await supabase
          .from(
            "jovem_aprendiz"
          )
          .select(
            `
              id_ja,
              nome,
              email,
              telefone,
              endereco,
              avatar_url
            `
          )
          .in(
            "id_ja",
            idsCandidatos
          );

      if (jovensError) {
        console.error(
          "Erro ao buscar jovens:",
          jovensError
        );

        throw jovensError;
      }

      console.log(
        "Jovens encontrados:",
        jovensData
      );

      const {
        data: curriculosData,
        error: curriculosError,
      } =
        await supabase
          .from(
            "curriculo_ja"
          )
          .select(
            `
              id_ja,
              descricao,
              competencias,
              experiencias,
              curso
            `
          )
          .in(
            "id_ja",
            idsCandidatos
          );

      if (curriculosError) {
        console.error(
          "Erro ao buscar currículos:",
          curriculosError
        );

        throw curriculosError;
      }

      console.log(
        "Currículos encontrados:",
        curriculosData
      );
      const {
        data: invitesData,
        error: invitesError,
      } =
        await supabase
          .from("form_invites")
          .select(
            `
              id,
              created_at,
              form_id,
              id_em,
              id_ja,
              status
            `
          )
          .eq(
            "id_em",
            user.id
          )
          .in(
            "id_ja",
            idsCandidatos
          );

      if (invitesError) {
        console.error(
          "Erro ao buscar convites:",
          invitesError
        );

        throw invitesError;
      }

      console.log(
        "Convites encontrados:",
        invitesData
      );
      const formIds: string[] = [];

      (invitesData || []).forEach(
        (invite) => {
          if (
            invite.form_id &&
            formIds.indexOf(
              invite.form_id
            ) === -1
          ) {
            formIds.push(
              invite.form_id
            );
          }
        }
      );

      let formsData: any[] = [];

      if (formIds.length > 0) {
        const {
          data,
          error,
        } =
          await supabase
            .from("forms")
            .select(
              `
                id,
                id_em,
                created_at,
                title,
                description
              `
            )
            .in(
              "id",
              formIds
            );

        if (error) {
          console.error(
            "Erro ao buscar formulários:",
            error
          );

          throw error;
        }

        formsData = data || [];
      }

      console.log(
        "Formulários encontrados:",
        formsData
      );

      let questionsData: PerguntaPreEntrevista[] =
        [];

      if (formIds.length > 0) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "form_questions"
            )
            .select(
              `
                id,
                form_id,
                question_text,
                type,
                options,
                created_at
              `
            )
            .in(
              "form_id",
              formIds
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            );

        if (error) {
          console.error(
            "Erro ao buscar perguntas:",
            error
          );

          throw error;
        }

        questionsData =
          (data || []).map(
            (question) => ({
              ...question,
              options:
                Array.isArray(
                  question.options
                )
                  ? question.options
                  : [],
            })
          );
      }

      console.log(
        "Perguntas encontradas:",
        questionsData
      );

      const {
        data: responsesData,
        error: responsesError,
      } =
        await supabase
          .from(
            "form_responses"
          )
          .select(
            `
              id,
              created_at,
              form_id,
              user_id,
              answers
            `
          )
          .in(
            "user_id",
            idsCandidatos
          )
          .in(
            "form_id",
            formIds.length > 0
              ? formIds
              : ["00000000-0000-0000-0000-000000000000"]
          );

      if (responsesError) {
        console.error(
          "Erro ao buscar respostas:",
          responsesError
        );

        throw responsesError;
      }

      console.log(
        "Respostas das pré-entrevistas:",
        responsesData
      );
      const listaFormatada: Candidatura[] =
        candidaturas.map(
          (candidatura) => {
            const vaga =
              vagas.find(
                (item) =>
                  item.id_vag ===
                  candidatura.id_vaga
              );

            const jovem =
              (jovensData || []).find(
                (item) =>
                  item.id_ja ===
                  candidatura.id_candidato
              ) as
                | JovemAprendiz
                | undefined;

            const curriculo =
              (
                curriculosData ||
                []
              ).find(
                (item) =>
                  item.id_ja ===
                  candidatura.id_candidato
              ) as
                | Curriculo
                | undefined;

            const cursoFormatado =
              formatarCursos(
                curriculo?.curso
              );

            /*
             * Formata experiências.
             */

            const experienciasFormatadas =
              jsonParaTexto(
                curriculo?.experiencias
              );

            const preEntrevistas:
              {
                formulario: FormularioPreEntrevista;
                resposta: FormResponse;
              }[] = [];

            const invitesDoCandidato =
              (invitesData || []).filter(
                (invite) =>
                  invite.id_ja ===
                  candidatura.id_candidato
              );

            invitesDoCandidato.forEach(
              (invite) => {
                const form =
                  formsData.find(
                    (item) =>
                      item.id ===
                      invite.form_id
                  );

                if (!form) {
                  return;
                }

                const response =
                  (
                    responsesData ||
                    []
                  ).find(
                    (item) =>
                      item.form_id ===
                        invite.form_id &&
                      item.user_id ===
                        candidatura.id_candidato
                  ) as
                    | FormResponse
                    | undefined;

                if (!response) {
                  return;
                }
                const formulario:
                  FormularioPreEntrevista =
                  {
                    id: form.id,
                    id_em:
                      form.id_em,
                    title:
                      form.title ||
                      "Pré-entrevista",
                    description:
                      form.description ||
                      "",
                    created_at:
                      form.created_at,
                    questions:
                      questionsData
                        .filter(
                          (question) =>
                            question.form_id ===
                            form.id
                        ),
                  };

                preEntrevistas.push({
                  formulario,
                  resposta: {
                    id:
                      response.id,
                    created_at:
                      response.created_at,
                    form_id:
                      response.form_id,
                    user_id:
                      response.user_id,
                    answers:
                      response.answers ||
                      {},
                  },
                });
              }
            );

            const preEntrevistasUnicas:
              {
                formulario: FormularioPreEntrevista;
                resposta: FormResponse;
              }[] = [];

            preEntrevistas.forEach(
              (item) => {
                const jaExiste =
                  preEntrevistasUnicas.some(
                    (existente) =>
                      existente.formulario.id ===
                      item.formulario.id
                  );

                if (!jaExiste) {
                  preEntrevistasUnicas.push(
                    item
                  );
                }
              }
            );

            console.log(
              "Pré-entrevistas do candidato:",
              candidatura.id_candidato,
              preEntrevistasUnicas
            );

            return {
              id_candidatura:
                candidatura.id_candidatura,

              id_vag:
                candidatura.id_vaga,

              id_candidato:
                candidatura.id_candidato,

              data_candidatura:
                candidatura.data_candidatura,

              status_aprovacao:
                candidatura.status_aprovacao,

              vaga: {
                titulo:
                  vaga?.titulo ||
                  "Vaga não encontrada",

                id_em:
                  vaga?.id_em ||
                  user.id,
              },

              curriculo: {
                nome:
                  jovem?.nome ||
                  "Jovem Aprendiz",

                telefone:
                  jovem?.telefone ||
                  "Não informado",

                endereco:
                  jovem?.endereco ||
                  "Não informado",

                email:
                  jovem?.email ||
                  "Não informado",

                descricao:
                  curriculo?.descricao ||
                  "",

                competencias:
                  curriculo?.competencias ||
                  "",

                experiencias:
                  experienciasFormatadas,

                curso:
                  cursoFormatado ||
                  "Não informado",
              },

              preEntrevistas:
                preEntrevistasUnicas,
            };
          }
        );

      console.log(
        "LISTA FINAL:",
        listaFormatada
      );

      setCandidaturas(
        listaFormatada
      );
    } catch (error) {
      console.error(
        "===================================="
      );

      console.error(
        "ERRO AO BUSCAR CANDIDATOS:",
        error
      );

      console.error(
        "===================================="
      );

      setCandidaturas([]);
    } finally {
      setLoading(false);
    }
  }

  async function buscarFormulario(): Promise<string> {
    const {
      data,
      error,
    } =
      await supabase
        .from("forms")
        .select(
          "id, created_at"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "Erro ao buscar formulário:",
        error
      );

      throw error;
    }

    if (!data) {
      throw new Error(
        "Nenhum formulário encontrado."
      );
    }

    const formulario =
      data as Formulario;

    return formulario.id;
  }

  async function aceitarCandidato(
    candidatura: Candidatura
  ) {
    const confirmar =
      window.confirm(
        `Deseja aceitar ${candidatura.curriculo.nome} para a vaga "${candidatura.vaga.titulo}"?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setProcessandoId(
        candidatura.id_candidatura
      );

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        alert(
          "Sua sessão expirou. Faça login novamente."
        );

        return;
      }

      const formId =
        await buscarFormulario();

      console.log(
        "Formulário selecionado:",
        formId
      );

      const {
        error: updateError,
      } =
        await supabase
          .from(
            "candidaturas"
          )
          .update({
            status_aprovacao:
              "aceito",
          })
          .eq(
            "id_candidatura",
            candidatura.id_candidatura
          );

      if (updateError) {
        throw updateError;
      }

      const {
        data: conviteExistente,
        error: conviteError,
      } =
        await supabase
          .from(
            "form_invites"
          )
          .select("id")
          .eq(
            "form_id",
            formId
          )
          .eq(
            "id_em",
            user.id
          )
          .eq(
            "id_ja",
            candidatura.id_candidato
          )
          .limit(1)
          .maybeSingle();

      if (conviteError) {
        throw conviteError;
      }

      if (!conviteExistente) {
        const {
          error: insertError,
        } =
          await supabase
            .from(
              "form_invites"
            )
            .insert({
              form_id:
                formId,

              id_em:
                user.id,

              id_ja:
                candidatura.id_candidato,

              status:
                "pendente",
            });

        if (insertError) {
          throw insertError;
        }

        console.log(
          "Convite criado com sucesso."
        );
      } else {
        console.log(
          "Convite já existente."
        );
      }

      setCandidaturas(
        (prev) =>
          prev.map(
            (item) =>
              item.id_candidatura ===
              candidatura.id_candidatura
                ? {
                    ...item,
                    status_aprovacao:
                      "aceito",
                  }
                : item
          )
      );

      alert(
        "Candidato aceito e pré-entrevista enviada!"
      );
    } catch (error) {
      console.error(
        "Erro ao aceitar candidato:",
        error
      );

      alert(
        "Não foi possível aceitar o candidato."
      );
    } finally {
      setProcessandoId(null);
    }
  }

  async function rejeitarCandidato(
    candidatura: Candidatura
  ) {
    const confirmar =
      window.confirm(
        `Deseja realmente rejeitar a candidatura de ${candidatura.curriculo.nome}?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setProcessandoId(
        candidatura.id_candidatura
      );

      const {
        error,
      } =
        await supabase
          .from(
            "candidaturas"
          )
          .update({
            status_aprovacao:
              "rejeitado",
          })
          .eq(
            "id_candidatura",
            candidatura.id_candidatura
          );

      if (error) {
        throw error;
      }

      setCandidaturas(
        (prev) =>
          prev.map(
            (item) =>
              item.id_candidatura ===
              candidatura.id_candidatura
                ? {
                    ...item,
                    status_aprovacao:
                      "rejeitado",
                  }
                : item
          )
      );

      alert(
        "Candidatura rejeitada."
      );
    } catch (error) {
      console.error(
        "Erro ao rejeitar candidato:",
        error
      );

      alert(
        "Não foi possível rejeitar o candidato."
      );
    } finally {
      setProcessandoId(null);
    }
  }

  const abrirChatComJovem = (
    idJovem: string
  ) => {
    navigate(
      "/mensagensEmpresa",
      {
        state: {
          idJovemSelecionado:
            idJovem,
        },
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  function renderStatus(
    status: string | null
  ) {
    if (status === "aceito") {
      return (
        <span
          className={`${styles.statusBadge} ${styles.statusAceito}`}
        >
          ✓ Aceito
        </span>
      );
    }

    if (
      status === "rejeitado"
    ) {
      return (
        <span
          className={`${styles.statusBadge} ${styles.statusRejeitado}`}
        >
          ✕ Rejeitado
        </span>
      );
    }

    return (
      <span
        className={`${styles.statusBadge} ${styles.statusPendente}`}
      >
        ● Pendente
      </span>
    );
  }

  return (
    <div
      className={
        styles.container
      }
    >
      <div className="no-print">
        <SidebarEmpresa />
      </div>

      <main
        className={`${styles.content} no-print`}
      >
        <header
          className={
            styles.headerArea
          }
        >
          <div
            className={
              styles.headerText
            }
          >
            <h1>
              Candidatos às Suas Vagas
            </h1>

            <p>
              Gerencie os jovens que se
              candidataram às vagas
              publicadas pela sua empresa.
            </p>
          </div>
        </header>

        {loading ? (
          <div
            className={
              styles.loading
            }
          >
            Carregando
            candidaturas...
          </div>
        ) : candidaturas.length ===
          0 ? (
          <div
            className={
              styles.semCandidatos
            }
          >
            <div
              className={
                styles.emptyIcon
              }
            >
              👥
            </div>

            <h2>
              Nenhum candidato
              encontrado
            </h2>

            <p>
              Quando um jovem se
              candidatar às suas vagas,
              ele aparecerá aqui.
            </p>
          </div>
        ) : (
          <section
            className={
              styles.candidatosSection
            }
          >
            <div
              className={
                styles.listHeader
              }
            >
              <div>
                <h2>
                  Candidaturas
                  recebidas
                </h2>

                <span>
                  {
                    candidaturas.length
                  }{" "}
                  candidatura(s)
                </span>
              </div>
            </div>

            <div
              className={
                styles.candidatosGrid
              }
            >
              {candidaturas.map(
                (cand) => {
                  const processando =
                    processandoId ===
                    cand.id_candidatura;

                  return (
                    <article
                      key={
                        cand.id_candidatura
                      }
                      className={
                        styles.cardCandidato
                      }
                    >
                      <div
                        className={
                          styles.cardHeader
                        }
                      >
                        <div
                          className={
                            styles.cardTitleArea
                          }
                        >
                          <h2
                            title={
                              cand.vaga
                                .titulo
                            }
                          >
                            {
                              cand.vaga
                                .titulo
                            }
                          </h2>

                          <span
                            className={
                              styles.dataTag
                            }
                          >
                            {new Date(
                              cand.data_candidatura
                            ).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>

                        {renderStatus(
                          cand.status_aprovacao
                        )}
                      </div>

                      <div
                        className={
                          styles.candidatoInfo
                        }
                      >
                        <h3>
                          {
                            cand.curriculo
                              .nome
                          }
                        </h3>

                        <p>
                          <strong>
                            Curso:
                          </strong>
                        </p>

                        <p
                          style={{
                            whiteSpace:
                              "pre-line",
                          }}
                        >
                          {
                            cand.curriculo
                              .curso
                          }
                        </p>

                        <p>
                          <strong>
                            Email:
                          </strong>{" "}
                          {
                            cand.curriculo
                              .email
                          }
                        </p>

                        <p>
                          <strong>
                            Telefone:
                          </strong>{" "}
                          {
                            cand.curriculo
                              .telefone
                          }
                        </p>

                        {cand.preEntrevistas
                          .length >
                          0 && (
                          <p>
                            <strong>
                              ✓ Pré-entrevista
                              respondida
                            </strong>
                          </p>
                        )}
                      </div>

                      <div
                        className={
                          styles.cardFooter
                        }
                      >
                        <button
                          className={
                            styles.btnChat
                          }
                          onClick={() =>
                            abrirChatComJovem(
                              cand.id_candidato
                            )
                          }
                        >
                          Chat
                        </button>

                        <button
                          className={
                            styles.btnVisualizar
                          }
                          onClick={() =>
                            setCandidaturaSelecionada(
                              cand
                            )
                          }
                        >
                          Ver Currículo
                        </button>

                        {cand.status_aprovacao !==
                          "aceito" && (
                          <button
                            className={
                              styles.btnAceitar
                            }
                            disabled={
                              processando
                            }
                            onClick={() =>
                              aceitarCandidato(
                                cand
                              )
                            }
                          >
                            {processando
                              ? "Processando..."
                              : "✓ Aceitar"}
                          </button>
                        )}

                        {cand.status_aprovacao !==
                          "rejeitado" && (
                          <button
                            className={
                              styles.btnRejeitar
                            }
                            disabled={
                              processando
                            }
                            onClick={() =>
                              rejeitarCandidato(
                                cand
                              )
                            }
                          >
                            {processando
                              ? "Processando..."
                              : "✕ Rejeitar"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}
      </main>

      {/*
       * ========================================================
       * MODAL CURRÍCULO
       * ========================================================
       */}

      {candidaturaSelecionada && (
        <div
          className={
            styles.modalOverlay
          }
        >
          <div
            className={`${styles.modalContainer} cv-print-area`}
          >
            <div
              className={`${styles.modalActions} no-print`}
            >
              <button
                className={
                  styles.btnImprimir
                }
                onClick={
                  handlePrint
                }
              >
                Imprimir / Salvar
                PDF
              </button>

              <button
                className={
                  styles.btnFechar
                }
                onClick={() =>
                  setCandidaturaSelecionada(
                    null
                  )
                }
              >
                ✕
              </button>
            </div>

            {/*
             * ==================================================
             * CABEÇALHO DO CURRÍCULO
             * ==================================================
             */}

            <header
              className={
                styles.cvHeader
              }
            >
              <h1>
                {
                  candidaturaSelecionada
                    .curriculo
                    .nome
                }
              </h1>

              <p>
                <strong>
                  Vaga pretendida:
                </strong>{" "}
                {
                  candidaturaSelecionada
                    .vaga
                    .titulo
                }
              </p>

              <div
                className={
                  styles.cvContact
                }
              >
                <span>
                  <strong>
                    Email:
                  </strong>{" "}
                  {
                    candidaturaSelecionada
                      .curriculo
                      .email
                  }
                </span>

                <span>
                  <strong>
                    Telefone:
                  </strong>{" "}
                  {
                    candidaturaSelecionada
                      .curriculo
                      .telefone
                  }
                </span>

                <span>
                  <strong>
                    Endereço:
                  </strong>{" "}
                  {
                    candidaturaSelecionada
                      .curriculo
                      .endereco
                  }
                </span>
              </div>
            </header>

            {/*
             * ==================================================
             * DESCRIÇÃO
             * ==================================================
             */}

            {candidaturaSelecionada
              .curriculo
              .descricao && (
              <section
                className={
                  styles.cvSection
                }
              >
                <h3>
                  Resumo
                </h3>

                <p>
                  {
                    candidaturaSelecionada
                      .curriculo
                      .descricao
                  }
                </p>
              </section>
            )}

            {/*
             * ==================================================
             * CURSO
             * ==================================================
             */}

            {candidaturaSelecionada
              .curriculo
              .curso &&
              candidaturaSelecionada
                .curriculo
                .curso !==
                "Não informado" && (
                <section
                  className={
                    styles.cvSection
                  }
                >
                  <h3>
                    Formação / Curso
                  </h3>

                  <p
                    className={
                      styles.cvPreWrap
                    }
                  >
                    {
                      candidaturaSelecionada
                        .curriculo
                        .curso
                    }
                  </p>
                </section>
              )}

            {/*
             * ==================================================
             * COMPETÊNCIAS
             * ==================================================
             */}

            {candidaturaSelecionada
              .curriculo
              .competencias && (
              <section
                className={
                  styles.cvSection
                }
              >
                <h3>
                  Competências &
                  Habilidades
                </h3>

                <p
                  className={
                    styles.cvPreWrap
                  }
                >
                  {
                    candidaturaSelecionada
                      .curriculo
                      .competencias
                  }
                </p>
              </section>
            )}

            {/*
             * ==================================================
             * EXPERIÊNCIAS
             * ==================================================
             */}

            {candidaturaSelecionada
              .curriculo
              .experiencias && (
              <section
                className={
                  styles.cvSection
                }
              >
                <h3>
                  Experiências
                </h3>

                <p
                  className={
                    styles.cvPreWrap
                  }
                >
                  {
                    candidaturaSelecionada
                      .curriculo
                      .experiencias
                  }
                </p>
              </section>
            )}

            {/*
             * ==================================================
             * PRÉ-ENTREVISTAS
             * ==================================================
             */}

            <section
              className={
                styles.cvSection
              }
            >
              <h3>
                Pré-Entrevista
              </h3>

              {candidaturaSelecionada
                .preEntrevistas
                .length === 0 ? (
                <div
                  className={
                    styles.preEntrevistaVazia
                  }
                >
                  <p>
                    O candidato ainda não
                    respondeu à
                    pré-entrevista.
                  </p>
                </div>
              ) : (
                candidaturaSelecionada
                  .preEntrevistas
                  .map(
                    (
                      preEntrevista
                    ) => (
                      <div
                        key={
                          preEntrevista
                            .formulario
                            .id
                        }
                        className={
                          styles.preEntrevista
                        }
                      >
                        <div
                          className={
                            styles.preEntrevistaHeader
                          }
                        >
                          <h4>
                            {
                              preEntrevista
                                .formulario
                                .title
                            }
                          </h4>

                          {preEntrevista
                            .resposta
                            .created_at && (
                            <span>
                              Respondida em{" "}
                              {new Date(
                                preEntrevista
                                  .resposta
                                  .created_at
                              ).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          )}
                        </div>

                        {preEntrevista
                          .formulario
                          .description && (
                          <p
                            className={
                              styles.preEntrevistaDescricao
                            }
                          >
                            {
                              preEntrevista
                                .formulario
                                .description
                            }
                          </p>
                        )}

                        <div
                          className={
                            styles.respostasPreEntrevista
                          }
                        >
                          {preEntrevista
                            .formulario
                            .questions
                            .map(
                              (
                                pergunta,
                                index
                              ) => {
                                const resposta =
                                  preEntrevista
                                    .resposta
                                    .answers[
                                    pergunta
                                      .id
                                  ];

                                return (
                                  <div
                                    key={
                                      pergunta.id
                                    }
                                    className={
                                      styles.respostaPreEntrevista
                                    }
                                  >
                                    <div
                                      className={
                                        styles.numeroPergunta
                                      }
                                    >
                                      {index +
                                        1}
                                    </div>

                                    <div
                                      className={
                                        styles.conteudoResposta
                                      }
                                    >
                                      <strong>
                                        {
                                          pergunta.question_text
                                        }
                                      </strong>

                                      <p
                                        className={
                                          styles.textoResposta
                                        }
                                      >
                                        {formatarRespostaPreEntrevista(
                                          resposta
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                        </div>
                      </div>
                    )
                  )
              )}
            </section>

            <footer
              className={
                styles.cvFooter
              }
            >
              CIJA — Centro de
              Integração Jovem
              Aprendiz
            </footer>
          </div>
        </div>
      )}

      {/*
       * ========================================================
       * IMPRESSÃO
       * ========================================================
       */}

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }

            .cv-print-area,
            .cv-print-area * {
              visibility: visible;
            }

            .cv-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default CandidatosEmpresa;
