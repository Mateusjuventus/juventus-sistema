import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, DocumentoHeader, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  categoriaBox: {
    marginTop: 10,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  categoriaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoriaTitulo: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro },
  categoriaSubtotal: { fontSize: 9, fontWeight: 700, color: CORES.grena },
  tabela: { marginTop: 2 },
  linhaCabecalho: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    paddingBottom: 4,
    marginBottom: 3,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    alignItems: "center",
  },
  colDescricao: { flex: 1 },
  colValor: { width: 90, textAlign: "right" },
  headerCell: { fontSize: 6.5, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  totalGeralBox: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CORES.dourado,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalGeralLabel: { fontSize: 11, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },
  totalGeralValor: { fontSize: 13, fontWeight: 700, color: CORES.grena },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface OrcamentoPdfGasto {
  descricao: string | null;
  valorPrevisto: number;
}

export interface OrcamentoPdfCategoria {
  nome: string;
  gastos: OrcamentoPdfGasto[];
}

/**
 * PDF do orçamento previsto de um jogo (só o previsto — não é comparativo com o efetuado), para
 * uso como documento de apoio antes do jogo. Ver
 * docs/superpowers/specs/2026-07-14-prestacao-contas-financeiro-design.md.
 */
export function OrcamentoDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  categorias,
  totalGeral,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  categorias: OrcamentoPdfCategoria[];
  totalGeral: number;
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Orçamento Previsto"
        />

        {categorias.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum gasto lançado para este jogo.</Text>
        ) : (
          categorias.map((c) => {
            const subtotal = c.gastos.reduce((soma, g) => soma + g.valorPrevisto, 0);
            return (
              <View style={styles.categoriaBox} key={c.nome} wrap={false}>
                <View style={styles.categoriaHeaderRow}>
                  <Text style={styles.categoriaTitulo}>{c.nome}</Text>
                  <Text style={styles.categoriaSubtotal}>{formatMoeda(subtotal)}</Text>
                </View>
                <View style={styles.tabela}>
                  <View style={styles.linhaCabecalho}>
                    <Text style={[styles.colDescricao, styles.headerCell]}>Descrição</Text>
                    <Text style={[styles.colValor, styles.headerCell]}>Valor Previsto</Text>
                  </View>
                  {c.gastos.map((g, i) => (
                    <View style={styles.linha} key={i}>
                      <Text style={[styles.colDescricao, styles.cell]}>{g.descricao ?? "—"}</Text>
                      <Text style={[styles.colValor, styles.cell]}>{formatMoeda(g.valorPrevisto)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

        {categorias.length > 0 ? (
          <View style={styles.totalGeralBox}>
            <Text style={styles.totalGeralLabel}>Total Previsto</Text>
            <Text style={styles.totalGeralValor}>{formatMoeda(totalGeral)}</Text>
          </View>
        ) : null}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
