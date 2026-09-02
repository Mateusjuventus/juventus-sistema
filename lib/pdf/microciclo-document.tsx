import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { DocumentoFooter, type LogoSrc } from "./logistica-shared";
import { CabecalhoExportacaoBanner, CORES_EXPORT } from "./programacao-export-shared";
import { montarLinhaMicrociclo, type MicrocicloData, type MicrocicloAtividade } from "@/lib/programacao/microciclo-data";

/**
 * Exportação em PDF do microciclo (ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-
 * layout-geral-design.md, Parte 2) — redesenhada pra seguir o modelo impresso que o clube já usa
 * (CA JUVENTUS SAF SUB-20, "MICROCICLO Nº21"): faixa grená com escudo + estrelas (sem brasão da
 * FPF, a pedido do Mateus), barra lateral única "MANHÃ"/"TARDE" (Tarde e Noite combinados num só
 * bloco visual — os dois turnos continuam existindo separados no banco), faixa "Sede Social" com o
 * local do Treino do dia, e cards de jogo com os dois escudos (Juventus × adversário). SEM bloco de
 * assinatura, a pedido do Mateus (ver `DocumentoFooter`, já sem nome algum).
 *
 * Alturas fixas abaixo (ALTURA_MANHA/ALTURA_SEDE_SOCIAL/ALTURA_TARDE) são estimativa inicial de
 * engenharia — ajustar visualmente contra a foto/PDF de referência do Mateus antes de considerar a
 * exportação pronta (ver plano de implementação, "Riscos/decisões de implementação sinalizadas").
 */

const ALTURA_MANHA = 140;
const ALTURA_SEDE_SOCIAL = 12;
const ALTURA_TARDE = 110;

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 50, fontFamily: "Helvetica", fontSize: 8, color: "#262626" },
  corpoRow: { flexDirection: "row", flex: 1, marginTop: 8 },
  turnoSidebar: { width: 14, flexDirection: "column" },
  turnoSidebarManha: { minHeight: ALTURA_MANHA, alignItems: "center", justifyContent: "center" },
  turnoSidebarTarde: {
    minHeight: ALTURA_SEDE_SOCIAL + ALTURA_TARDE,
    alignItems: "center",
    justifyContent: "center",
  },
  turnoSidebarTexto: {
    fontSize: 7,
    fontWeight: 700,
    color: "#a3a3a3",
    textTransform: "uppercase",
    letterSpacing: 1,
    transform: "rotate(-90deg)",
  },
  grade: { flexDirection: "row", gap: 4, flex: 1 },
  coluna: { flex: 1, borderWidth: 0.75, borderColor: "#d4d4d4", borderRadius: 3, overflow: "hidden" },
  colunaHeader: {
    backgroundColor: CORES_EXPORT.cabecalho,
    paddingVertical: 5,
    alignItems: "center",
  },
  colunaHeaderDia: { fontSize: 7, fontWeight: 700, color: "#ffffff", letterSpacing: 0.3 },
  colunaHeaderData: { fontSize: 9, fontWeight: 700, color: "#ffffff", marginTop: 1 },
  folgaBox: {
    minHeight: ALTURA_MANHA + ALTURA_SEDE_SOCIAL + ALTURA_TARDE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CORES_EXPORT.folgaBg,
  },
  folgaTexto: {
    fontSize: 8.5,
    fontWeight: 700,
    color: CORES_EXPORT.folgaText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  manhaBloco: { minHeight: ALTURA_MANHA, padding: 4 },
  sedeSocialBloco: {
    minHeight: ALTURA_SEDE_SOCIAL,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  sedeSocialTexto: { fontSize: 6.5, fontWeight: 700, color: "#737373", textAlign: "center" },
  tardeBloco: { minHeight: ALTURA_TARDE, padding: 4 },
  atividadeBox: { borderWidth: 0.75, borderColor: "#e5e5e5", borderRadius: 2, padding: 3, marginBottom: 3 },
  atividadeNome: { fontSize: 7.5, fontWeight: 700 },
  atividadeHorario: { fontSize: 6.5, marginTop: 0.5 },
  turnoVazio: { fontSize: 6.5, color: "#d4d4d4", fontStyle: "italic" },
});

// `jogoBox` usa a cor grená de marca (não a navy da exportação genérica) — mantém o mesmo
// vocabulário visual já usado em todo o sistema pra "isto é um jogo" (grená = `CORES.grena`).
const jogoBoxStyle = { borderRadius: 2, padding: 3, marginBottom: 3, backgroundColor: "#5C0A35" };
const jogoStyles = StyleSheet.create({
  tag: { fontSize: 6, fontWeight: 700, color: "#F2D48B", textTransform: "uppercase", letterSpacing: 0.5 },
  escudosRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  escudo: { width: 14, height: 14, objectFit: "contain" },
  escudoVazio: { width: 14, height: 14 },
  x: { fontSize: 6.5, fontWeight: 700, color: "#e5d4dd" },
  texto: { fontSize: 7, fontWeight: 700, color: "#ffffff", marginTop: 2 },
  detalhe: { fontSize: 6.5, color: "#e5d4dd", marginTop: 1 },
});

function CardJogo({ atividade, juventusLogoSrc }: { atividade: MicrocicloAtividade; juventusLogoSrc: LogoSrc }) {
  const jogo = atividade.jogo;
  if (!jogo) return null;

  const primeiro = jogo.mandante
    ? { src: juventusLogoSrc, nome: "Juventus" }
    : { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome };
  const segundo = jogo.mandante
    ? { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome }
    : { src: juventusLogoSrc, nome: "Juventus" };

  return (
    <View style={jogoBoxStyle}>
      <Text style={jogoStyles.tag}>{atividade.tipoLabel}</Text>
      <View style={jogoStyles.escudosRow}>
        {primeiro.src ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={jogoStyles.escudo} src={primeiro.src as string} />
        ) : (
          <View style={jogoStyles.escudoVazio} />
        )}
        <Text style={jogoStyles.x}>×</Text>
        {segundo.src ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={jogoStyles.escudo} src={segundo.src as string} />
        ) : (
          <View style={jogoStyles.escudoVazio} />
        )}
      </View>
      <Text style={jogoStyles.texto}>
        {jogo.mandante ? "Juventus" : jogo.adversario_nome} × {jogo.mandante ? jogo.adversario_nome : "Juventus"}
      </Text>
      <Text style={jogoStyles.detalhe}>
        {atividade.horarioInicio}
        {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
      </Text>
    </View>
  );
}

function BlocoAtividade({ atividade }: { atividade: MicrocicloAtividade }) {
  return (
    <View style={[styles.atividadeBox, { backgroundColor: atividade.corBg }]}>
      <Text style={[styles.atividadeNome, { color: atividade.corText }]}>{atividade.nome}</Text>
      <Text style={[styles.atividadeHorario, { color: atividade.corText }]}>
        {atividade.horarioInicio}
        {atividade.horarioTermino ? `-${atividade.horarioTermino}` : ""}
        {atividade.local ? ` · ${atividade.local}` : ""}
      </Text>
    </View>
  );
}

export function MicrocicloDocument({
  dados,
  juventusLogoSrc,
}: {
  dados: MicrocicloData;
  juventusLogoSrc: LogoSrc;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <CabecalhoExportacaoBanner
          juventusLogoSrc={juventusLogoSrc}
          titulo={`CA Juventus SAF ${dados.categoriaLabel}`}
          subtitulo={[montarLinhaMicrociclo(dados.microcicloTexto, dados.epoca), dados.periodoTexto]
            .filter(Boolean)
            .join(" · ")}
        />

        <View style={styles.corpoRow}>
          <View style={styles.turnoSidebar}>
            <View style={styles.turnoSidebarManha}>
              <Text style={styles.turnoSidebarTexto}>Manhã</Text>
            </View>
            <View style={styles.turnoSidebarTarde}>
              <Text style={styles.turnoSidebarTexto}>Tarde</Text>
            </View>
          </View>

          <View style={styles.grade}>
            {dados.dias.map((dia) => {
              const sedeSocial = dia.atividadesPorTurno.manha.find((a) => a.tipo === "treinamento" && a.local)?.local;
              const atividadesTarde = [...dia.atividadesPorTurno.tarde, ...dia.atividadesPorTurno.noite];

              return (
                <View key={dia.data} style={styles.coluna}>
                  <View style={styles.colunaHeader}>
                    <Text style={styles.colunaHeaderDia}>{dia.diaSemana}</Text>
                    <Text style={styles.colunaHeaderData}>{dia.dataFmt}</Text>
                  </View>

                  {!dia.temAtividade ? (
                    <View style={styles.folgaBox}>
                      <Text style={styles.folgaTexto}>Folga</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.manhaBloco}>
                        {dia.atividadesPorTurno.manha.length === 0 ? (
                          <Text style={styles.turnoVazio}>—</Text>
                        ) : null}
                        {dia.atividadesPorTurno.manha.map((atividade) =>
                          atividade.jogo ? (
                            <CardJogo key={atividade.id} atividade={atividade} juventusLogoSrc={juventusLogoSrc} />
                          ) : (
                            <BlocoAtividade key={atividade.id} atividade={atividade} />
                          ),
                        )}
                      </View>

                      {sedeSocial ? (
                        <View style={styles.sedeSocialBloco}>
                          <Text style={styles.sedeSocialTexto}>{sedeSocial}</Text>
                        </View>
                      ) : null}

                      <View style={styles.tardeBloco}>
                        {atividadesTarde.length === 0 ? <Text style={styles.turnoVazio}>—</Text> : null}
                        {atividadesTarde.map((atividade) =>
                          atividade.jogo ? (
                            <CardJogo key={atividade.id} atividade={atividade} juventusLogoSrc={juventusLogoSrc} />
                          ) : (
                            <BlocoAtividade key={atividade.id} atividade={atividade} />
                          ),
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
