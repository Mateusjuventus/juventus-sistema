import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, type LogoSrc } from "./logistica-shared";
import type { MicrocicloData } from "@/lib/programacao/microciclo-data";
import { turnoLabel } from "@/lib/programacao/tipo-atividade";

/**
 * Exportação em PDF do microciclo (ver docs/superpowers/specs/2026-08-30-area-treinador-
 * programacao-design.md, "Exportação do microciclo") — reaproveita o cabeçalho/rodapé oficial de
 * `lib/pdf/logistica-shared.tsx` (mesma fonte/cores dos outros documentos do clube), mas com um
 * cabeçalho próprio (não o `DocumentoHeader` compartilhado, que é sempre "Juventus x adversário" —
 * o microciclo não é sobre um jogo específico) e SEM bloco de assinatura, a pedido do Mateus. Layout
 * paisagem: 7 colunas (dias), cada uma com os 3 turnos empilhados; um dia sem nenhuma atividade
 * lançada vira um único bloco "Folga", igual ao modelo impresso que o clube já usa.
 */

const TURNOS = ["manha", "tarde", "noite"] as const;

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 50, fontFamily: "Helvetica", fontSize: 8, color: "#262626" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  escudo: { width: 34, height: 34, objectFit: "contain" },
  headerTextos: { flex: 1 },
  categoriaTitulo: {
    fontSize: 13,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  microcicloLinha: { fontSize: 9, color: "#525252", marginTop: 1 },
  periodo: { fontSize: 9, fontWeight: 700, color: CORES.grena, marginTop: 1 },
  grade: { flexDirection: "row", gap: 4, flex: 1 },
  coluna: { flex: 1, borderWidth: 0.75, borderColor: "#d4d4d4", borderRadius: 3, overflow: "hidden" },
  colunaHeader: {
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    alignItems: "center",
  },
  colunaHeaderDia: { fontSize: 7, fontWeight: 700, color: "#ffffff", letterSpacing: 0.3 },
  colunaHeaderData: { fontSize: 9, fontWeight: 700, color: "#ffffff", marginTop: 1 },
  folgaBox: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5" },
  folgaTexto: { fontSize: 8.5, fontWeight: 700, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: 1 },
  turnoBloco: { padding: 4 },
  turnoLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: "#a3a3a3",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  atividadeBox: { borderRadius: 2, padding: 3, marginBottom: 3 },
  atividadeNome: { fontSize: 7.5, fontWeight: 700 },
  atividadeHorario: { fontSize: 6.5, marginTop: 0.5 },
  jogoBox: {
    borderRadius: 2,
    padding: 3,
    marginBottom: 3,
    backgroundColor: CORES.grena,
  },
  jogoTag: { fontSize: 6, fontWeight: 700, color: "#F2D48B", textTransform: "uppercase", letterSpacing: 0.5 },
  jogoTexto: { fontSize: 7, fontWeight: 700, color: "#ffffff", marginTop: 1 },
  jogoDetalhe: { fontSize: 6.5, color: "#e5d4dd", marginTop: 1 },
  turnoVazio: { fontSize: 6.5, color: "#d4d4d4", fontStyle: "italic" },
});

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
        <View style={styles.headerRow}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.escudo} src={juventusLogoSrc as string} />
          ) : null}
          <View style={styles.headerTextos}>
            <Text style={styles.categoriaTitulo}>Programação Semanal · {dados.categoriaLabel}</Text>
            <Text style={styles.microcicloLinha}>
              {dados.microcicloAtual !== null ? `Microciclo Nº ${dados.microcicloAtual}` : "Microciclo"}
              {dados.epoca ? ` · Época ${dados.epoca}` : ""}
            </Text>
            <Text style={styles.periodo}>{dados.periodoTexto}</Text>
          </View>
        </View>

        <View style={styles.grade}>
          {dados.dias.map((dia) => (
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
                <View>
                  {TURNOS.map((turno) => {
                    const atividades = dia.atividadesPorTurno[turno];
                    return (
                      <View key={turno} style={styles.turnoBloco}>
                        <Text style={styles.turnoLabel}>{turnoLabel(turno)}</Text>
                        {atividades.length === 0 ? <Text style={styles.turnoVazio}>—</Text> : null}
                        {atividades.map((atividade) =>
                          atividade.jogo ? (
                            <View key={atividade.id} style={styles.jogoBox}>
                              <Text style={styles.jogoTag}>{atividade.tipoLabel}</Text>
                              <Text style={styles.jogoTexto}>
                                {atividade.jogo.mandante ? "Juventus" : atividade.jogo.adversario_nome} ×{" "}
                                {atividade.jogo.mandante ? atividade.jogo.adversario_nome : "Juventus"}
                              </Text>
                              <Text style={styles.jogoDetalhe}>
                                {atividade.horarioInicio}
                                {atividade.jogo.local_estadio ? ` · ${atividade.jogo.local_estadio}` : ""}
                              </Text>
                            </View>
                          ) : (
                            <View
                              key={atividade.id}
                              style={[styles.atividadeBox, { backgroundColor: atividade.corBg }]}
                            >
                              <Text style={[styles.atividadeNome, { color: atividade.corText }]}>
                                {atividade.nome}
                              </Text>
                              <Text style={[styles.atividadeHorario, { color: atividade.corText }]}>
                                {atividade.horarioInicio}
                                {atividade.horarioTermino ? `-${atividade.horarioTermino}` : ""}
                                {atividade.local ? ` · ${atividade.local}` : ""}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
