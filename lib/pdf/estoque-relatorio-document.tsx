import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, sharedStyles, type LogoSrc } from "./logistica-shared";
import type { EstoqueCategoria } from "@/lib/supabase/types";

const TITULOS: Record<EstoqueCategoria, string> = {
  esportivo: "Relatório de Estoque — Material Esportivo",
  medico: "Relatório de Estoque — Material Médico",
};

const styles = StyleSheet.create({
  logoBox: {
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  logo: { width: 36, height: 36, objectFit: "contain" },
  tituloBar: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: CORES.grena,
    paddingVertical: 7,
  },
  tituloTexto: {
    fontSize: 12,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  geradoEmTexto: { fontSize: 8, color: "#737373", textAlign: "center", marginTop: 8, marginBottom: 10 },
  tabela: { borderWidth: 1, borderColor: "#262626" },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a3a3a3",
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
  },
  colDivisor: { borderRightWidth: 0.5, borderRightColor: "#d4d4d4" },
  cell: { fontSize: 8, paddingVertical: 2, paddingHorizontal: 4 },
  colUnidade: { width: 140 },
  colMg: { width: 55, textAlign: "center" },
  colDescricaoMedico: { width: 170 },
  colDescricaoEsportivo: { width: 250 },
  colCodigo: { width: 65, textAlign: "center" },
  colTamanhos: { width: 140 },
  colTotal: { flex: 1, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderTopColor: "#262626",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#FAFAFA",
  },
  totalLabel: { flex: 1, textAlign: "right", paddingRight: 8, fontSize: 9, fontWeight: 700, color: "#171717" },
  totalValor: { width: 60, textAlign: "center", fontSize: 9, fontWeight: 700, color: "#171717" },
});

export interface EstoqueRelatorioPdfItem {
  nome: string;
  codigo: string | null;
  mg: string | null;
  tamanhos: Record<string, number>;
}

export interface EstoqueRelatorioPdfData {
  categoria: EstoqueCategoria;
  /** Data/hora já formatada (ex: "16/07/2026 às 14:32"). */
  geradoEm: string;
}

function totalItem(tamanhos: Record<string, number>): number {
  return Object.values(tamanhos ?? {}).reduce((soma, q) => soma + Number(q || 0), 0);
}

function formatTamanhos(tamanhos: Record<string, number>): string {
  const entradas = Object.entries(tamanhos ?? {});
  if (entradas.length === 0) return "—";
  return entradas.map(([t, q]) => `${t}: ${q}`).join("  ·  ");
}

/**
 * Relatório do catálogo de Estoque (Esportivo ou Médico) — uma lista de todos os itens cadastrados
 * com as quantidades atuais, pra imprimir ou conferir rapidamente. Diferente da Ficha de Saída
 * (que é o documento oficial assinado, com o mesmo layout do formulário em papel do clube), este
 * relatório é só uma conferência do catálogo, por isso o Médico usa a ordem de colunas pedida
 * (Unidade — Mg — Descrição — Código — Total) em vez de seguir o layout fixo da ficha.
 */
export function EstoqueRelatorioDocument({
  juventusLogoSrc,
  dados,
  itens,
}: {
  juventusLogoSrc: LogoSrc;
  dados: EstoqueRelatorioPdfData;
  itens: EstoqueRelatorioPdfItem[];
}) {
  const totalGeral = itens.reduce((soma, i) => soma + totalItem(i.tamanhos), 0);
  const medico = dados.categoria === "medico";

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.logoBox}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
        </View>
        <View style={styles.tituloBar}>
          <Text style={styles.tituloTexto}>{TITULOS[dados.categoria]}</Text>
        </View>
        <Text style={styles.geradoEmTexto}>
          Gerado em {dados.geradoEm} · {itens.length} referência{itens.length === 1 ? "" : "s"} · {totalGeral} peça
          {totalGeral === 1 ? "" : "s"} em estoque
        </Text>

        <View style={styles.tabela}>
          {medico ? (
            <View style={styles.headerRow}>
              <Text style={[styles.colUnidade, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>
                Unidade / Qtd.
              </Text>
              <Text style={[styles.colMg, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>Mg</Text>
              <Text style={[styles.colDescricaoMedico, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>
                Descrição
              </Text>
              <Text style={[styles.colCodigo, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>
                Código
              </Text>
              <Text style={[styles.colTotal, styles.cell, sharedStyles.headerCell]}>Total</Text>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <Text style={[styles.colDescricaoEsportivo, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>
                Descrição
              </Text>
              <Text style={[styles.colCodigo, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>
                Código
              </Text>
              <Text style={[styles.colTamanhos, styles.colDivisor, styles.cell, sharedStyles.headerCell]}>
                Tamanhos / Qtd.
              </Text>
              <Text style={[styles.colTotal, styles.cell, sharedStyles.headerCell]}>Total</Text>
            </View>
          )}

          {itens.length === 0 ? (
            <Text style={sharedStyles.emptyState}>Nenhum item cadastrado.</Text>
          ) : medico ? (
            itens.map((item, i) => (
              <View style={styles.row} key={i} wrap={false}>
                <Text style={[styles.colUnidade, styles.colDivisor, styles.cell]}>{formatTamanhos(item.tamanhos)}</Text>
                <Text style={[styles.colMg, styles.colDivisor, styles.cell]}>{item.mg || "—"}</Text>
                <Text style={[styles.colDescricaoMedico, styles.colDivisor, styles.cell]}>{item.nome}</Text>
                <Text style={[styles.colCodigo, styles.colDivisor, styles.cell]}>{item.codigo || "—"}</Text>
                <Text style={[styles.colTotal, styles.cell]}>{totalItem(item.tamanhos)}</Text>
              </View>
            ))
          ) : (
            itens.map((item, i) => (
              <View style={styles.row} key={i} wrap={false}>
                <Text style={[styles.colDescricaoEsportivo, styles.colDivisor, styles.cell]}>{item.nome}</Text>
                <Text style={[styles.colCodigo, styles.colDivisor, styles.cell]}>{item.codigo || "—"}</Text>
                <Text style={[styles.colTamanhos, styles.colDivisor, styles.cell]}>{formatTamanhos(item.tamanhos)}</Text>
                <Text style={[styles.colTotal, styles.cell]}>{totalItem(item.tamanhos)}</Text>
              </View>
            ))
          )}

          {itens.length > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total geral:</Text>
              <Text style={styles.totalValor}>{totalGeral}</Text>
            </View>
          ) : null}
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
