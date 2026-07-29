import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import {
  AssinaturasBlock,
  type AssinaturaInfo,
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
  DocumentoHeader,
  formatDataBr,
  sharedStyles,
  type LogoSrc,
} from "./logistica-shared";

const styles = StyleSheet.create({
  categoriaBox: {
    marginTop: 6,
    padding: 6,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  categoriaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  categoriaTitulo: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro },
  categoriaSubtotal: { fontSize: 9, fontWeight: 700, color: CORES.grena },
  tabela: { marginTop: 0 },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 2.5,
    alignItems: "center",
  },
  colData: { width: 56 },
  colDescricao: { flex: 1 },
  colValor: { width: 90, textAlign: "right" },
  cell: { fontSize: 8, color: "#262626" },
  totalGeralBox: {
    marginTop: 10,
    paddingTop: 6,
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

export interface RelatorioDespesasPdfGasto {
  data: string | null;
  descricao: string | null;
  valorEfetuado: number;
}

export interface RelatorioDespesasPdfCategoria {
  nome: string;
  gastos: RelatorioDespesasPdfGasto[];
}

/**
 * Relatório de Despesas: a prestação de contas de verdade de um jogo — só entram os gastos que
 * já têm valor efetuado lançado (o que de fato foi gasto), com a data de cada um. Distinto do
 * Orçamento Previsto (que mostra só o planejado, antes do jogo, para aprovação). Ver
 * docs/superpowers/specs/2026-07-14-prestacao-contas-financeiro-design.md.
 */
export function RelatorioDespesasDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  categorias,
  totalGeral,
  geradoEm,
  assinatura1,
  assinatura2,
  departamento,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  categorias: RelatorioDespesasPdfCategoria[];
  totalGeral: number;
  geradoEm: Date;
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
  departamento: "profissional" | "base";
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento={departamento} />
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Relatório de Despesas (Pós Jogo)"
        />

        {categorias.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma despesa efetuada lançada para este jogo.</Text>
        ) : (
          categorias.map((c) => {
            const subtotal = c.gastos.reduce((soma, g) => soma + g.valorEfetuado, 0);
            return (
              <View style={styles.categoriaBox} key={c.nome} wrap={false}>
                <View style={styles.categoriaHeaderRow}>
                  <Text style={styles.categoriaTitulo}>{c.nome}</Text>
                  <Text style={styles.categoriaSubtotal}>{formatMoeda(subtotal)}</Text>
                </View>
                <View style={styles.tabela}>
                  {c.gastos.map((g, i) => (
                    <View style={styles.linha} key={i}>
                      <Text style={[styles.colData, styles.cell]}>{formatDataBr(g.data)}</Text>
                      <Text style={[styles.colDescricao, styles.cell]}>{g.descricao ?? "—"}</Text>
                      <Text style={[styles.colValor, styles.cell]}>{formatMoeda(g.valorEfetuado)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

        {categorias.length > 0 ? (
          <View style={styles.totalGeralBox}>
            <Text style={styles.totalGeralLabel}>Total Efetuado</Text>
            <Text style={styles.totalGeralValor}>{formatMoeda(totalGeral)}</Text>
          </View>
        ) : null}

        <AssinaturasBlock assinatura1={assinatura1} assinatura2={assinatura2} />

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
