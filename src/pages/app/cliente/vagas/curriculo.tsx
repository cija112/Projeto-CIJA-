import React from "react";
import html2pdf from "html2pdf.js";
import "./curriculo.style.css";

interface CurriculoProps {
  jovemData?: any;
  resultadoInicial?: any;
}

function escapeHtml(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderHtmlCurriculo(d: any): string {
  const contatoItems: string[] = [];
  if (d.cidade) contatoItems.push(`<span>${escapeHtml(d.cidade)}</span>`);
  if (d.telefone) contatoItems.push(`<span>${escapeHtml(d.telefone)}</span>`);
  if (d.email) contatoItems.push(`<span>${escapeHtml(d.email)}</span>`);
  if (d.linkedin) contatoItems.push(`<span>${escapeHtml(d.linkedin)}</span>`);
  if (d.github) contatoItems.push(`<span>${escapeHtml(d.github)}</span>`);

  const experiencias = Array.isArray(d.experiencias) ? d.experiencias : [];
  const formacao = Array.isArray(d.formacao) ? d.formacao : [];
  const habilidades = Array.isArray(d.habilidades) ? d.habilidades : [];
  const idiomas = Array.isArray(d.idiomas) ? d.idiomas : [];

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Currículo - ${escapeHtml(d.nome)}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 20mm;
        }
        body {
          font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
          color: #111827;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.5;
        }
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        h1, h2, h3, p, ul {
          orphans: 3;
          widows: 3;
        }
      </style>
    </head>
    <body>
      <div style="width:100%;box-sizing:border-box;">
        <div style="border-bottom:3px solid #1e3a8a;padding-bottom:18px;margin-bottom:22px;text-align:center;">
          <h1 style="font-size:26px;font-weight:800;color:#1e3a8a;text-transform:uppercase;margin:0 0 6px 0;letter-spacing:0.5px;">
            ${escapeHtml(d.nome)}
          </h1>
          <div style="font-size:11px;color:#4b5563;display:flex;justify-content:center;flex-wrap:wrap;gap:16px;font-weight:500;">
            ${contatoItems.join(" &bull; ")}
          </div>
        </div>

        ${
          d.resumo
            ? `
          <div class="section">
            <h2 style="font-size:12px;font-weight:700;color:#1e3a8a;text-transform:uppercase;border-bottom:1.5px solid #e5e7eb;padding-bottom:4px;margin:0 0 8px 0;">
              Resumo Profissional
            </h2>
            <p style="font-size:11.5px;line-height:1.6;color:#374151;margin:0;text-align:justify;">
              ${escapeHtml(d.resumo)}
            </p>
          </div>`
            : ""
        }

        ${
          experiencias.length > 0
            ? `
          <div class="section">
            <h2 style="font-size:12px;font-weight:700;color:#1e3a8a;text-transform:uppercase;border-bottom:1.5px solid #e5e7eb;padding-bottom:4px;margin:0 0 10px 0;">
              Experiência Profissional
            </h2>
            ${experiencias
              .map((exp: any) => {
                const bullets = Array.isArray(exp.bullets)
                  ? exp.bullets
                  : exp.descricao
                    ? String(exp.descricao)
                        .split("\n")
                        .map((b: string) => b.replace(/^[•\-*]\s*/, "").trim())
                        .filter(Boolean)
                    : [];
                return `
              <div style="margin-bottom:12px;page-break-inside:avoid;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
                  <h3 style="font-size:12px;font-weight:700;color:#111827;margin:0;">${escapeHtml(exp.cargo || exp.titulo)}</h3>
                  <span style="font-size:10.5px;font-weight:600;color:#6b7280;">${escapeHtml(exp.periodo)}</span>
                </div>
                <div style="font-size:11.5px;font-weight:600;color:#2563eb;margin-bottom:4px;">${escapeHtml(exp.empresa)}</div>
                ${
                  bullets.length > 0
                    ? `<ul style="margin:0 0 0 16px;padding:0;">${bullets
                        .map(
                          (b: string) =>
                            `<li style="font-size:11px;line-height:1.5;color:#374151;margin-bottom:2px;text-align:justify;">${escapeHtml(b)}</li>`,
                        )
                        .join("")}</ul>`
                    : ""
                }
              </div>`;
              })
              .join("")}
          </div>`
            : ""
        }

        ${
          formacao.length > 0
            ? `
          <div class="section">
            <h2 style="font-size:12px;font-weight:700;color:#1e3a8a;text-transform:uppercase;border-bottom:1.5px solid #e5e7eb;padding-bottom:4px;margin:0 0 10px 0;">
              Formação Acadêmica
            </h2>
            ${formacao
              .map(
                (form: any) => `
              <div style="margin-bottom:8px;page-break-inside:avoid;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;">
                  <h3 style="font-size:11.5px;font-weight:700;color:#111827;margin:0;">${escapeHtml(form.curso)}${form.status ? ` <span style="font-weight:500;color:#6b7280;font-size:10.5px;">&mdash; ${escapeHtml(form.status)}</span>` : ""}</h3>
                  <span style="font-size:10.5px;color:#6b7280;">${escapeHtml(form.periodo)}</span>
                </div>
                ${form.instituicao ? `<div style="font-size:11px;color:#4b5563;margin-top:2px;">${escapeHtml(form.instituicao)}</div>` : ""}
              </div>`,
              )
              .join("")}
          </div>`
            : ""
        }

        ${
          habilidades.length > 0
            ? `
          <div class="section">
            <h2 style="font-size:12px;font-weight:700;color:#1e3a8a;text-transform:uppercase;border-bottom:1.5px solid #e5e7eb;padding-bottom:4px;margin:0 0 10px 0;">
              Habilidades e Competências
            </h2>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${habilidades
                .map(
                  (hab: string) =>
                    `<span style="background-color:#f3f4f6;color:#1f2937;padding:3px 6px;border-radius:4px;font-size:10.5px;font-weight:600;border:1px solid #e5e7eb;">${escapeHtml(hab)}</span>`,
                )
                .join("")}
            </div>
          </div>`
            : ""
        }

        ${
          idiomas.length > 0
            ? `
          <div class="section">
            <h2 style="font-size:12px;font-weight:700;color:#1e3a8a;text-transform:uppercase;border-bottom:1.5px solid #e5e7eb;padding-bottom:4px;margin:0 0 8px 0;">
              Idiomas
            </h2>
            <ul style="margin:0 0 0 16px;padding:0;">
              ${idiomas
                .map((i: any) => {
                  const nomeIdioma =
                    typeof i === "string" ? i : i.nome || i.idioma || "";
                  const nivel = typeof i === "string" ? "" : i.nivel || "";
                  return `<li style="font-size:11px;color:#374151;margin-bottom:2px;"><strong>${escapeHtml(nomeIdioma)}</strong>${nivel ? ` <span style="color:#6b7280;">&mdash; ${escapeHtml(nivel)}</span>` : ""}</li>`;
                })
                .join("")}
            </ul>
          </div>`
            : ""
        }
      </div>
    </body>
    </html>
  `;
}

export function extrairDadosCurriculo(resultadoIA: any, jovemData?: any) {
  const rawIAData =
    resultadoIA?.curriculoEstruturado ||
    resultadoIA?.resposta?.curriculoEstruturado ||
    resultadoIA?.resposta?.curriculo ||
    resultadoIA ||
    {};

  const dp = rawIAData?.dados_pessoais || rawIAData?.dadosPessoais || {};

  return {
    nome:
      dp.nome ||
      jovemData?.nome_completo ||
      jovemData?.nome ||
      "Candidato Profissional",
    cidade: dp.cidade || jovemData?.cidade || "",
    telefone: dp.telefone || jovemData?.telefone || "",
    email: dp.email || jovemData?.email || "",
    linkedin: dp.linkedin || jovemData?.linkedin || "",
    github: dp.github || jovemData?.github || "",
    resumo:
      rawIAData?.resumo_profissional ||
      rawIAData?.resumoProfissional ||
      rawIAData?.resumo ||
      "",
    experiencias: rawIAData?.experiencias || rawIAData?.experiencia || [],
    formacao: rawIAData?.formacao || rawIAData?.formacao_academica || [],
    habilidades: rawIAData?.habilidades || [],
    idiomas: rawIAData?.idiomas || rawIAData?.idiomas_e_cursos || [],
  };
}

export async function baixarCurriculoPDF(
  resultadoIA: any,
  jovemData?: any,
): Promise<void> {
  const dados = extrairDadosCurriculo(resultadoIA, jovemData);
  const htmlContent = renderHtmlCurriculo(dados);

  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  document.body.appendChild(container);

  const opt = {
    margin: [15, 20, 15, 20],
    filename: `curriculo-${dados.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 800,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  try {
    // @ts-ignore
    await html2pdf().set(opt).from(container).save();
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export const Curriculo: React.FC<CurriculoProps> = ({
  jovemData,
  resultadoInicial,
}) => {
  const dadosFormatados = extrairDadosCurriculo(resultadoInicial, jovemData);

  return (
    <div className="curriculo-container">
      <div className="curriculo-actions">
        <button
          onClick={() => baixarCurriculoPDF(resultadoInicial, jovemData)}
          className="btn-baixar-pdf"
        >
          Baixar PDF
        </button>
      </div>

      <div
        dangerouslySetInnerHTML={{
          __html: renderHtmlCurriculo(dadosFormatados),
        }}
      />
    </div>
  );
};

export default Curriculo;
