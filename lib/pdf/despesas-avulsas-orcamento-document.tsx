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
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d4d4d4",
    paddingBottom: 2,
    marginBottom: 1,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 2.5,
    alignItems: "flex-start",
  },
  colData: { width: 62 },
  colDescricao: { flex: 1 },
  colValor: { width: 90, textAlign: "right" },
  headerCell: { fontSize: 6.5, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
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
  jogosIncluidosBox: {
    alignItems: "center",
    marginTop: -8,
    marginBottom: 14,
  },
  jogosIncluidosLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    textAlign: "center",
  },
  jogosIncluidosValor: { fontSize: 8.5, color: "#404040", marginTop: 2, textAlign: "center" },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface DespesaAvulsaOrcamentoPdfItem {
  data: string | null;
  descricao: string | null;
  valorPrevisto: number;
}

export interface DespesaAvulsaOrcamentoPdfCategoria {
  nome: string;
  despesas: DespesaAvulsaOrcamentoPdfItem[];
}

/**
 * PDF "Orçamento Previsto — Despesas Avulsas": só o previsto (mesmo espírito do
 * lib/pdf/orcamento-document.tsx de cada jogo, documento de apoio pra aprovação antes do gasto
 * acontecer), mas para despesas que não pertencem a nenhum jogo. Sem cabeçalho de confronto — não
 * tem um jogo "dono", cabeçalho genérico (mesmo padrão do relatório geral). Ver
 * docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md.
 */
export function DespesasAvulsasOrcamentoDocument({
  juventusLogoSrc,
  geradoEm,
  categorias,
  totalGeral,
  assinatura1,
  assinatura2,
  departamento,
  subtitulo,
  jogosRelacionados,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  categorias: DespesaAvulsaOrcamentoPdfCategoria[];
  totalGeral: number;
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
  departamento: "profissional" | "base";
  /** Escolhido na hora de gerar o PDF (ver /financeiro/despesas-avulsas): o jogo selecionado (se
   * houver) ou um título livre digitado pelo Mateus — em branco se nenhum dos dois for informado.
   * Substitui o texto fixo antigo "Despesas avulsas — não ligadas a um jogo específico", que o
   * Mateus já sabe de cor e pediu pra tirar. */
  subtitulo?: string;
  /** Confrontos (já formatados) de todos os jogos relacionados às despesas incluídas neste
   * relatório — informação do documento como um todo, mostrada logo abaixo do cabeçalho (mesmo
   * lugar em que o confronto aparece nos PDFs de financeiro de cada jogo), e não mais atrelada a
   * cada despesa individualmente (o Mateus pediu pra tirar a etiqueta por linha) nem embaixo do
   * total (ele pediu pra subir pro topo). */
  jogosRelacionados?: string[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento={departamento} />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Orçamento Previsto</Text>
        <Text style={styles.subtitulo}>{subtitulo ?? ""}</Text>

        {jogosRelacionados && jogosRelacionados.length > 0 ? (
          <View style={styles.jogosIncluidosBox}>
            <Text style={styles.jogosIncluidosLabel}>Jogos relacionados</Text>
            <Text style={styles.jogosIncluidosValor}>{jogosRelacionados.join(", ")}</Text>
          </View>
        ) : null}

        {categorias.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma despesa avulsa lançada ainda.</Text>
        ) : (
          categorias.map((c) => {
            const subtotal = c.despesas.reduce((soma, d) => soma + d.valorPrevisto, 0);
            return (
              <View style={styles.categoriaBox} key={c.nome} wrap={false}>
                <View style={styles.categoriaHeaderRow}>
                  <Text style={styles.categoriaTitulo}>{c.nome}</Text>
                  <Text style={styles.categoriaSubtotal}>{formatMoeda(subtotal)}</Text>
                </View>
                <View style={styles.tabela}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.colData, styles.headerCell]}>Data</Text>
                    <Text style={[styles.colDescricao, styles.headerCell]}>Descrição</Text>
                    <Text style={[styles.colValor, styles.headerCell]}>Valor Previsto</Text>
                  </View>
                  {c.despesas.map((d, i) => (
                    <View style={styles.linha} key={i}>
                      <Text style={[styles.colData, styles.cell]}>{formatDataBr(d.data)}</Text>
                      <View style={styles.colDescricao}>
                        <Text style={styles.cell}>{d.descricao ?? "—"}</Text>
                      </View>
                      <Text style={[styles.colValor, styles.cell]}>{formatMoeda(d.valorPrevisto)}</Text>
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

        <AssinaturasBlock assinatura1={assinatura1} assinatura2={assinatura2} />

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
