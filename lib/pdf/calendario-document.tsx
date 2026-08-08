import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import { labelDaCategoria } from "@/lib/futebol/calendario";
import type { EventoCalendarioCategoria } from "@/lib/supabase/types";

const styles = StyleSheet.create({
  headerLogo: { width: 52, height: 60, alignSelf: "center", objectFit: "contain", marginTop: 2 },
  titulo: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 18 },
  colData: { width: 60 },
  colHorario: { width: 45 },
  colTitulo: { flex: 1.6 },
  colDetalhe: { flex: 1.4 },
});

export interface CalendarioPdfItem {
  data: string;
  horario: string | null;
  titulo: string;
  /** Categoria do evento manual, ou `"jogo"` — decide o texto e a cor da tag na última coluna. */
  categoria: EventoCalendarioCategoria | "jogo";
  detalhe: string | null;
}

/**
 * PDF do widget "Calendário" da Home do Futebol Profissional — lista jogos + eventos manuais do
 * mês corrente em ordem de data (ver docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md).
 * Sem confronto único no topo (diferente do `DocumentoHeader` compartilhado, pensado pra
 * documentos de um jogo só) — segue o mesmo padrão "cabeçalho solto" do
 * `RelatorioFinanceiroDocument` (crachá + título + subtítulo).
 */
export function CalendarioDocument({
  juventusLogoSrc,
  mesLabel,
  geradoEm,
  itens,
}: {
  juventusLogoSrc: LogoSrc;
  mesLabel: string;
  geradoEm: Date;
  itens: CalendarioPdfItem[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Calendário — {mesLabel}</Text>
        <Text style={styles.subtitulo}>Jogos e eventos do mês, em ordem de data</Text>

        {itens.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum jogo ou evento neste mês.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colData, sharedStyles.headerCell]}>Data</Text>
              <Text style={[styles.colHorario, sharedStyles.headerCell]}>Horário</Text>
              <Text style={[styles.colTitulo, sharedStyles.headerCell]}>Evento</Text>
              <Text style={[styles.colDetalhe, sharedStyles.headerCell]}>Detalhe</Text>
            </View>
            {itens.map((item, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colData}>{formatDataBr(item.data)}</Text>
                <Text style={styles.colHorario}>{item.horario ? item.horario.slice(0, 5) : "—"}</Text>
                <Text style={styles.colTitulo}>{item.titulo}</Text>
                <Text style={styles.colDetalhe}>
                  {item.categoria === "jogo" ? "Jogo" : labelDaCategoria(item.categoria)}
                  {item.detalhe ? ` · ${item.detalhe}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
