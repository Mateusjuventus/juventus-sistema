import React from "react";
import { CORES_POSTER } from "./estilo";
import { CabecalhoExportacaoImg } from "./poster-imagem-shared";
import { montarLinhaMicrociclo, type MicrocicloData, type MicrocicloAtividade } from "@/lib/programacao/microciclo-data";

/**
 * Versão em imagem (JPG) do microciclo — mesmo redesenho de `lib/pdf/microciclo-document.tsx`
 * (ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-geral-design.md, Parte 2),
 * montado com `next/og` (ver `lib/posters/renderizar-imagem.ts`,
 * `renderizarImagemLargaComoJpeg`). Layout largo (não é um pôster retrato como Relacionados/
 * Concentração/Dia de Jogo), por isso não reaproveita `poster-imagem-shared.tsx` além do cabeçalho
 * compartilhado.
 *
 * Alturas fixas abaixo são a mesma proporção (~2×) das usadas no PDF paisagem — ajustar
 * visualmente contra a foto/PDF de referência do Mateus antes de considerar a exportação pronta.
 */

export const MICROCICLO_IMAGEM_LARGURA = 1700;
export const MICROCICLO_IMAGEM_ALTURA_CANVAS = 1300;

const ALTURA_MANHA = 280;
const ALTURA_SEDE_SOCIAL = 24;
const ALTURA_TARDE = 220;

const CORES_EXPORT = { cabecalho: "#1E3A5F", folgaBg: "#f5f5f5", folgaText: "#a3a3a3" };

function CardJogo({ atividade }: { atividade: MicrocicloAtividade }) {
  const jogo = atividade.jogo;
  if (!jogo) return null;

  const primeiro = jogo.mandante
    ? { nome: "Juventus" }
    : { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: CORES_POSTER.grena,
        borderRadius: 4,
        padding: "6px 8px",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", fontSize: 11, fontWeight: 700, color: "#F2D48B", textTransform: "uppercase" }}>
        {atividade.tipoLabel}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        {jogo.mandante ? null : primeiro.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primeiro.src} width={22} height={22} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", width: 22, height: 22 }} />
        )}
        <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
          {jogo.mandante ? "Juventus" : jogo.adversario_nome} × {jogo.mandante ? jogo.adversario_nome : "Juventus"}
        </div>
        {jogo.mandante && jogo.adversarioLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={jogo.adversarioLogoUrl} width={22} height={22} style={{ objectFit: "contain" }} />
        ) : null}
      </div>
      <div style={{ display: "flex", fontSize: 11, color: "#e5d4dd", marginTop: 2 }}>
        {atividade.horarioInicio}
        {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
      </div>
    </div>
  );
}

function BlocoAtividade({ atividade }: { atividade: MicrocicloAtividade }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: atividade.corBg,
        border: "0.75px solid #e5e5e5",
        borderRadius: 4,
        padding: "6px 8px",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: atividade.corText }}>{atividade.nome}</div>
      <div style={{ display: "flex", fontSize: 11, color: atividade.corText, marginTop: 2 }}>
        {atividade.horarioInicio}
        {atividade.horarioTermino ? `-${atividade.horarioTermino}` : ""}
        {atividade.local ? ` · ${atividade.local}` : ""}
      </div>
    </div>
  );
}

export function microcicloImagemJsx(dados: MicrocicloData) {
  return (
    <div
      style={{
        width: MICROCICLO_IMAGEM_LARGURA,
        display: "flex",
        flexDirection: "column",
        backgroundColor: CORES_POSTER.branco,
        padding: 28,
      }}
    >
      <CabecalhoExportacaoImg
        titulo={`CA Juventus SAF ${dados.categoriaLabel}`}
        subtitulo={[montarLinhaMicrociclo(dados.microcicloTexto, dados.epoca), dados.periodoTexto]
          .filter(Boolean)
          .join(" · ")}
      />

      <div style={{ display: "flex", marginTop: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 26 }}>
          <div
            style={{
              display: "flex",
              height: ALTURA_MANHA,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 12,
                fontWeight: 700,
                color: "#a3a3a3",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                transform: "rotate(-90deg)",
              }}
            >
              Manhã
            </div>
          </div>
          <div
            style={{
              display: "flex",
              height: ALTURA_SEDE_SOCIAL + ALTURA_TARDE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 12,
                fontWeight: 700,
                color: "#a3a3a3",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                transform: "rotate(-90deg)",
              }}
            >
              Tarde
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flex: 1 }}>
          {dados.dias.map((dia) => {
            const sedeSocial = dia.atividadesPorTurno.manha.find((a) => a.tipo === "treinamento" && a.local)?.local;
            const atividadesTarde = [...dia.atividadesPorTurno.tarde, ...dia.atividadesPorTurno.noite];

            return (
              <div
                key={dia.data}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  border: "1px solid #d4d4d4",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    backgroundColor: CORES_EXPORT.cabecalho,
                    padding: "8px 4px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 11, fontWeight: 700, color: "#ffffff" }}>{dia.diaSemana}</div>
                  <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>
                    {dia.dataFmt}
                  </div>
                </div>

                {!dia.temAtividade ? (
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: CORES_EXPORT.folgaBg,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 13,
                        fontWeight: 700,
                        color: CORES_EXPORT.folgaText,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Folga
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", height: ALTURA_MANHA, padding: 8 }}>
                      {dia.atividadesPorTurno.manha.length === 0 ? (
                        <div style={{ display: "flex", fontSize: 11, color: "#d4d4d4" }}>—</div>
                      ) : null}
                      {dia.atividadesPorTurno.manha.map((atividade) =>
                        atividade.jogo ? (
                          <CardJogo key={atividade.id} atividade={atividade} />
                        ) : (
                          <BlocoAtividade key={atividade.id} atividade={atividade} />
                        ),
                      )}
                    </div>

                    {sedeSocial ? (
                      <div
                        style={{
                          display: "flex",
                          minHeight: ALTURA_SEDE_SOCIAL,
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px 4px",
                          borderTop: "0.5px solid #e5e5e5",
                          borderBottom: "0.5px solid #e5e5e5",
                        }}
                      >
                        <div style={{ display: "flex", fontSize: 11, fontWeight: 700, color: "#737373" }}>{sedeSocial}</div>
                      </div>
                    ) : null}

                    <div style={{ display: "flex", flexDirection: "column", height: ALTURA_TARDE, padding: 8 }}>
                      {atividadesTarde.length === 0 ? (
                        <div style={{ display: "flex", fontSize: 11, color: "#d4d4d4" }}>—</div>
                      ) : null}
                      {atividadesTarde.map((atividade) =>
                        atividade.jogo ? (
                          <CardJogo key={atividade.id} atividade={atividade} />
                        ) : (
                          <BlocoAtividade key={atividade.id} atividade={atividade} />
                        ),
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
