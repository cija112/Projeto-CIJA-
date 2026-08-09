import React, { useState } from "react";
import {
  baixarCurriculoPDF,
  baixarCurriculoDOCX,
  extrairDadosCurriculo,
} from "../../../../utils/geradorCurriculo";
import "./curriculo.style.css";

interface CurriculoProps {
  jovemData?: any;
  resultadoInicial?: any;
}

export const Curriculo: React.FC<CurriculoProps> = ({
  jovemData,
  resultadoInicial,
}) => {
  const [resultado] = useState(resultadoInicial || null);

  const rawIAData =
    resultado?.curriculoEstruturado ||
    resultado?.resposta?.curriculoEstruturado ||
    resultado?.resposta?.curriculo ||
    resultado?.resposta ||
    {};

  const nomeRealCandidato = jovemData?.nome || "Candidato";

  const curriculoObjIA = {
    dados_pessoais: {
      nome:
        rawIAData?.dados_pessoais?.nome ||
        rawIAData?.dadosPessoais?.nome ||
        nomeRealCandidato,
      cidade:
        rawIAData?.dados_pessoais?.cidade ||
        rawIAData?.dadosPessoais?.cidade ||
        jovemData?.cidade ||
        "São Paulo - SP",
      telefone:
        rawIAData?.dados_pessoais?.telefone ||
        rawIAData?.dadosPessoais?.telefone ||
        jovemData?.telefone ||
        "",
      email:
        rawIAData?.dados_pessoais?.email ||
        rawIAData?.dadosPessoais?.email ||
        jovemData?.email ||
        "",
      linkedin:
        rawIAData?.dados_pessoais?.linkedin ||
        rawIAData?.dadosPessoais?.linkedin ||
        jovemData?.linkedin ||
        "",
      github:
        rawIAData?.dados_pessoais?.github ||
        rawIAData?.dadosPessoais?.github ||
        jovemData?.github ||
        "",
    },
    resumo_profissional:
      rawIAData?.resumo_profissional ||
      rawIAData?.resumoProfissional ||
      rawIAData?.resumo ||
      resultado?.resposta?.analise ||
      "Profissional focado em resultados e alinhado aos objetivos da vaga.",
    experiencias: (rawIAData?.experiencias && rawIAData.experiencias.length > 0
      ? rawIAData.experiencias
      : null) ||
      (rawIAData?.experiencia && rawIAData.experiencia.length > 0
        ? rawIAData.experiencia
        : null) || [
        {
          cargo: "Experiência Profissional / Vivência Prática",
          empresa: "Empresa / Projeto",
          periodo: "Recente",
          descricao:
            resultado?.resposta?.curriculoOtimizadoText ||
            resultado?.curriculoOtimizadoText ||
            "Atuação voltada para projetos e metas corporativas.",
        },
      ],
    formacao: (rawIAData?.formacao && rawIAData.formacao.length > 0
      ? rawIAData.formacao
      : null) ||
      (rawIAData?.formacao_academica && rawIAData.formacao_academica.length > 0
        ? rawIAData.formacao_academica
        : null) || [
        {
          curso: jovemData?.formacao || "Ensino Médio / Técnico / Superior",
          instituicao: "Instituição de Ensino",
          periodo: "Concluído",
        },
      ],
    habilidades: (rawIAData?.habilidades && rawIAData.habilidades.length > 0
      ? rawIAData.habilidades
      : null) ||
      resultado?.resposta?.palavrasChaveEncontradas || [
        "Trabalho em Equipe",
        "Comunicação",
      ],
    idiomas: rawIAData?.idiomas || rawIAData?.idiomas_e_cursos || [],
  };

  const dadosRender = extrairDadosCurriculo(curriculoObjIA);

  // Objeto formatado corretamente para atender à tipagem de exportação (PDF/DOCX)
  const payloadExportacao = {
    curriculoEstruturado: curriculoObjIA,
    curriculoOtimizadoText:
      resultado?.resposta?.curriculoOtimizadoText ||
      resultado?.curriculoOtimizadoText,
  };

  return (
    <div className="curriculo-container">
      <div className="curriculo-header">
        <h1>{dadosRender.dp.nome || "Meu Currículo"}</h1>
        <p>
          {[
            dadosRender.dp.email,
            dadosRender.dp.telefone,
            dadosRender.dp.cidade,
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>

      <div className="curriculo-actions">
        <button
          onClick={() =>
            baixarCurriculoPDF(payloadExportacao, jovemData, undefined)
          }
          className="btn-baixar-pdf"
        >
          Baixar PDF
        </button>
        <button
          onClick={() =>
            baixarCurriculoDOCX(payloadExportacao, jovemData, undefined)
          }
          className="btn-baixar-docx"
        >
          Baixar DOCX
        </button>
      </div>

      <div className="curriculo-body">
        {dadosRender.resumo && (
          <section className="secao">
            <h2>Sobre Mim</h2>
            <p>{dadosRender.resumo}</p>
          </section>
        )}

        {Array.isArray(dadosRender.experiencias) &&
          dadosRender.experiencias.length > 0 && (
            <section className="secao">
              <h2>Experiência</h2>
              {dadosRender.experiencias.map((exp: any, idx: number) => (
                <div key={idx} className="item-experiencia">
                  <h3>
                    {exp.cargo || exp.titulo}{" "}
                    {exp.empresa ? `— ${exp.empresa}` : ""}
                  </h3>
                  {exp.periodo && (
                    <span className="periodo">{exp.periodo}</span>
                  )}
                  <p>{exp.descricao || exp.detalhes}</p>
                </div>
              ))}
            </section>
          )}

        {Array.isArray(dadosRender.formacao) &&
          dadosRender.formacao.length > 0 && (
            <section className="secao">
              <h2>Formação</h2>
              {dadosRender.formacao.map((form: any, idx: number) => (
                <div key={idx} className="item-formacao">
                  <h3>{form.curso}</h3>
                  {form.instituicao && (
                    <p>
                      <strong>{form.instituicao}</strong>
                    </p>
                  )}
                  {form.periodo && (
                    <span className="periodo">{form.periodo}</span>
                  )}
                </div>
              ))}
            </section>
          )}

        {Array.isArray(dadosRender.idiomas) &&
          dadosRender.idiomas.length > 0 && (
            <section className="secao">
              <h2>Idiomas / Cursos</h2>
              <ul>
                {dadosRender.idiomas.map((item: any, idx: number) => (
                  <li key={idx}>
                    {typeof item === "string"
                      ? item
                      : `${item.idioma || item.nome} ${item.nivel ? `(${item.nivel})` : ""}`}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {Array.isArray(dadosRender.habilidades) &&
          dadosRender.habilidades.length > 0 && (
            <section className="secao">
              <h2>Habilidades</h2>
              <p>{dadosRender.habilidades.join(", ")}</p>
            </section>
          )}
      </div>
    </div>
  );
};

export default Curriculo;
