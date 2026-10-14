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
import { labelFaseGasto, type FaseGasto } from "./relatorio-despesas-document";

const styles = StyleSheet.create({
  faseSecao: { marginTop: 5 },
  faseHeaderBar: {
    backgroundColor: CORES.grenaEscuro,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 3,
    marginBottom: 2,
  },
  faseHeaderTexto: {
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  faseSubtotalBox: {
    marginTop: 2,
    paddingTop: 2,
    borderTopWidth: 0.75,
    borderTopColor: CORES.grena,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faseSubtotalLabel: { fontSize: 8, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },
  faseSubtotalValor: { fontSize: 9, fontWeight: 700, color: CORES.grena },
  categoriaBox: {
    marginTop: 3,
    padding: 4,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  categoriaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1.5,
  },
  categoriaTitulo: { fontSize: 9.5, fontWeight: 700, color: CORES.grenaEscuro },
  categoriaSubtotal: { fontSize: 8, fontWeight: 700, color: CORES.grena },
  tabela: { marginTop: 0 },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d4d4d4",
    paddingBottom: 1.5,
    marginBottom: 1,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 1.5,
    alignItems: "center",
  },
  colData: { width: 82 },
  colDescricao: { flex: 1 },
  colValor: { width: 90, textAlign: "right" },
  headerCell: { fontSize: 6.25, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
  cell: { fontSize: 7.25, color: "#262626" },
  totalGeralBox: {
    marginTop: 8,
    paddingTop: 5,
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
  data: string | null;
  descricao: string | null;
  valorPrevisto: number;
}

export interface OrcamentoPdfCategoria {
  nome: string;
  gastos: OrcamentoPdfGasto[];
}

export interface OrcamentoPdfFase {
  fase: FaseGasto;
  categorias: OrcamentoPdfCategoria[];
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
  fases,
  totalGeral,
  geradoEm,
  assinatura1,
  assinatura2,
  departamento,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  fases: OrcamentoPdfFase[];
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
          titulo="Orçamento Previsto (Pré Jogo)"
        />

        {fases.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum gasto lançado para este jogo.</Text>
        ) : (
          fases.map((f) => {
            const subtotalFase = f.categorias.reduce(
              (soma, c) => soma + c.gastos.reduce((s, g) => s + g.valorPrevisto, 0),
              0,
            );
            return (
              <View style={styles.faseSecao} key={f.fase ?? "sem_fase"}>
                <View style={styles.faseHeaderBar}>
                  <Text style={styles.faseHeaderTexto}>{labelFaseGasto(f.fase)}</Text>
                </View>
                {f.categorias.map((c) => {
                  const subtotal = c.gastos.reduce((soma, g) => soma + g.valorPrevisto, 0);
                  return (
                    <View style={styles.categoriaBox} key={c.nome} wrap={false}>
                      <View style={styles.categoriaHeaderRow}>
                        <Text style={styles.categoriaTitulo}>{c.nome}</Text>
                        <Text style={styles.categoriaSubtotal}>{formatMoeda(subtotal)}</Text>
                      </View>
                      <View style={styles.tabela}>
                        <View style={styles.headerRow}>
                          <Text style={[styles.colData, styles.headerCell]}>Data de Pagamento</Text>
                          <Text style={[styles.colDescricao, styles.headerCell]}>Descrição</Text>
                          <Text style={[styles.colValor, styles.headerCell]}>Valor Previsto</Text>
                        </View>
                        {c.gastos.map((g, i) => (
                          <View style={styles.linha} key={i}>
                            <Text style={[styles.colData, styles.cell]}>{formatDataBr(g.data)}</Text>
                            <Text style={[styles.colDescricao, styles.cell]}>{g.descricao ?? "—"}</Text>
                            <Text style={[styles.colValor, styles.cell]}>{formatMoeda(g.valorPrevisto)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
                <View style={styles.faseSubtotalBox}>
                  <Text style={styles.faseSubtotalLabel}>Subtotal {labelFaseGasto(f.fase)}</Text>
                  <Text style={styles.faseSubtotalValor}>{formatMoeda(subtotalFase)}</Text>
                </View>
              </View>
            );
          })
        )}

        {fases.length > 0 ? (
          <View style={styles.totalGeralBox}>
            <Text style={styles.totalGeralLabel}>Total Previsto</Text>
            <Text style={styles.totalGeralValor}>{formatMoeda(totalGeral)}</Text>
          </View>
        ) : null}

        <AssinaturasBlock assinatura1={assinatura1} assinatura2={assinatura2} />

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
