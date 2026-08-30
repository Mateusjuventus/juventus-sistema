import React from "react";
import { CORES_POSTER } from "./estilo";
import { getJuventusEscudoDataUri } from "./poster-imagem-shared";
import type { MicrocicloData, MicrocicloAtividade } from "@/lib/programacao/microciclo-data";
import { turnoLabel } from "@/lib/programacao/tipo-atividade";

/**
 * Versão em imagem (JPG) do microciclo — mesmos dados e o mesmo espírito visual de
 * `lib/pdf/microciclo-document.tsx`, montado com `next/og` (ver `lib/posters/renderizar-imagem.ts`,
 * `renderizarImagemLargaComoJpeg`). Layout largo (não é um pôster retrato como Relacionados/
 * Concentração/Dia de Jogo), por isso não reaproveita `poster-imagem-shared.tsx` além do escudo.
 */

export const MICROCICLO_IMAGEM_LARGURA = 1700;
export const MICROCICLO_IMAGEM_ALTURA_CANVAS = 1300;

const TURNOS = ["manha", "tarde", "noite"] as const;

function BlocoAtividade({ atividade }: { atividade: MicrocicloAtividade }) {
  if (atividade.jogo) {
    const jogo = atividade.jogo;
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
        <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>
          {jogo.mandante ? "Juventus" : jogo.adversario_nome} × {jogo.mandante ? jogo.adversario_nome : "Juventus"}
        </div>
        <div style={{ display: "flex", fontSize: 11, color: "#e5d4dd", marginTop: 2 }}>
          {atividade.horarioInicio}
          {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: atividade.corBg,
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
  const juventus = getJuventusEscudoDataUri();

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
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={juventus} alt="" width={56} height={56} style={{ objectFit: "contain" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              color: CORES_POSTER.grenaEscuro,
              textTransform: "uppercase",
            }}
          >
            Programação Semanal · {dados.categoriaLabel}
          </div>
          <div style={{ display: "flex", fontSize: 15, color: "#525252", marginTop: 2 }}>
            {dados.microcicloAtual !== null ? `Microciclo Nº ${dados.microcicloAtual}` : "Microciclo"}
            {dados.epoca ? ` · Época ${dados.epoca}` : ""}
          </div>
          <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: CORES_POSTER.grena, marginTop: 2 }}>
            {dados.periodoTexto}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {dados.dias.map((dia) => (
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
                backgroundColor: CORES_POSTER.grena,
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
                  backgroundColor: "#f5f5f5",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#a3a3a3",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Folga
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", padding: 8 }}>
                {TURNOS.map((turno) => {
                  const atividades = dia.atividadesPorTurno[turno];
                  return (
                    <div key={turno} style={{ display: "flex", flexDirection: "column", marginBottom: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#a3a3a3",
                          textTransform: "uppercase",
                          marginBottom: 3,
                        }}
                      >
                        {turnoLabel(turno)}
                      </div>
                      {atividades.length === 0 ? (
                        <div style={{ display: "flex", fontSize: 11, color: "#d4d4d4" }}>—</div>
                      ) : null}
                      {atividades.map((atividade) => (
                        <BlocoAtividade key={atividade.id} atividade={atividade} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
