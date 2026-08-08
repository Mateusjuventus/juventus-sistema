import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  AssinaturasBlock,
  type AssinaturaInfo,
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
  formatDataBr,
  sharedStyles,
  type LogoSrc,
} from "./logistica-shared";

const styles = StyleSheet.create({
  headerLogo: { width: 44, height: 50, alignSelf: "center", objectFit: "contain" },
  titulo: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 16 },
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
    alignItems: "flex-start",
  },
  colData: { width: 56 },
  colDescricao: { flex: 1 },
  colValor: { width: 90, textAlign: "right" },
  cell: { fontSize: 8, color: "#262626" },
  cellJogos: { fontSize: 6.5, color: "#a3a3a3", marginTop: 1 },
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

export interface DespesaAvulsaRelatorioPdfItem {
  data: string | null;
  descricao: string | null;
  valorEfetuado: number;
  jogosRelacionados: string[];
}

export interface DespesaAvulsaRelatorioPdfCategoria {
  nome: string;
  despesas: DespesaAvulsaRelatorioPdfItem[];
}

/**
 * PDF "Relatório de Despesas — Despesas Avulsas": a prestação de contas de verdade (mesmo espírito
 * do lib/pdf/relatorio-despesas-document.tsx de cada jogo) — só entram despesas avulsas que já têm
 * valor efetuado lançado. Distinto do Orçamento Previsto (que mostra só o planejado). Sem
 * cabeçalho de confronto — cabeçalho genérico, mesmo padrão do relatório geral. Ver
 * docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md.
 */
export function DespesasAvulsasRelatorioDocument({
  juventusLogoSrc,
  geradoEm,
  categorias,
  totalGeral,
  assinatura1,
  assinatura2,
  departamento,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  categorias: DespesaAvulsaRelatorioPdfCategoria[];
  totalGeral: number;
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
  departamento: "profissional" | "base";
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento={departamento} />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relatório de Despesas</Text>
        <Text style={styles.subtitulo}>Despesas avulsas — não ligadas a um jogo específico</Text>

        {categorias.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma despesa avulsa efetuada lançada ainda.</Text>
        ) : (
          categorias.map((c) => {
            const subtotal = c.despesas.reduce((soma, d) => soma + d.valorEfetuado, 0);
            return (
              <View style={styles.categoriaBox} key={c.nome} wrap={false}>
                <View style={styles.categoriaHeaderRow}>
                  <Text style={styles.categoriaTitulo}>{c.nome}</Text>
                  <Text style={styles.categoriaSubtotal}>{formatMoeda(subtotal)}</Text>
                </View>
                <View style={styles.tabela}>
                  {c.despesas.map((d, i) => (
                    <View style={styles.linha} key={i}>
                      <Text style={[styles.colData, styles.cell]}>{formatDataBr(d.data)}</Text>
                      <View style={styles.colDescricao}>
                        <Text style={styles.cell}>{d.descricao ?? "—"}</Text>
                        {d.jogosRelacionados.length > 0 ? (
                          <Text style={styles.cellJogos}>Jogos: {d.jogosRelacionados.join(", ")}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.colValor, styles.cell]}>{formatMoeda(d.valorEfetuado)}</Text>
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
