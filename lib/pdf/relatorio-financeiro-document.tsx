import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  AssinaturasBlock,
  type AssinaturaInfo,
  CarimboGeracao,
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
  formatDataBr,
  sharedStyles,
  type LogoSrc,
} from "./logistica-shared";

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
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  statBox: {
    width: "31.5%",
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValor: { fontSize: 13, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 3 },
  statValorNegativo: { color: "#b91c1c" },
  sectionTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colCategoria: { flex: 1.4 },
  colJogo: { flex: 1.6 },
  colValor: { width: 82, textAlign: "right" },
  colValorNegativo: { width: 82, textAlign: "right", fontWeight: 700, color: "#b91c1c" },
  jogoConfronto: { fontSize: 8, fontWeight: 700, color: "#1f1f1f" },
  jogoSub: { fontSize: 7, color: "#737373", marginTop: 1 },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface RelatorioPdfCategoria {
  nome: string;
  previsto: number;
  efetuado: number;
}

export interface RelatorioPdfJogo {
  confronto: string;
  competicao: string;
  data: string;
  previsto: number;
  efetuado: number;
}

/**
 * Relatório geral da Prestação de Contas: totais somando todos os jogos, comparação por categoria
 * e resumo de cada jogo com gasto lançado. Mesmo padrão visual (departamento, carimbo e
 * assinaturas) do PDF de Orçamento Previsto — ver lib/pdf/orcamento-document.tsx.
 */
export function RelatorioFinanceiroDocument({
  juventusLogoSrc,
  geradoEm,
  totalPrevisto,
  totalEfetuado,
  categorias,
  jogos,
  assinatura1,
  assinatura2,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  totalPrevisto: number;
  totalEfetuado: number;
  categorias: RelatorioPdfCategoria[];
  jogos: RelatorioPdfJogo[];
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
}) {
  const totalDiferenca = totalPrevisto - totalEfetuado;

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <CarimboGeracao geradoEm={geradoEm} />
        <DepartamentoEyebrow />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relatório de Prestação de Contas</Text>
        <Text style={styles.subtitulo}>Resumo geral de todos os jogos</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Previsto</Text>
            <Text style={styles.statValor}>{formatMoeda(totalPrevisto)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Efetuado</Text>
            <Text style={styles.statValor}>{formatMoeda(totalEfetuado)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Diferença</Text>
            <Text
              style={{
                ...styles.statValor,
                ...(totalDiferenca < 0 ? styles.statValorNegativo : {}),
              }}
            >
              {formatMoeda(totalDiferenca)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitulo}>Por Categoria</Text>
        {categorias.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum gasto lançado ainda em nenhum jogo.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colCategoria, sharedStyles.headerCell]}>Categoria</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Previsto</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Efetuado</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Diferença</Text>
            </View>
            {categorias.map((c) => {
              const diferenca = c.previsto - c.efetuado;
              return (
                <View style={sharedStyles.tableRow} key={c.nome} wrap={false}>
                  <Text style={styles.colCategoria}>{c.nome}</Text>
                  <Text style={styles.colValor}>{formatMoeda(c.previsto)}</Text>
                  <Text style={styles.colValor}>{formatMoeda(c.efetuado)}</Text>
                  <Text style={diferenca < 0 ? styles.colValorNegativo : styles.colValor}>
                    {formatMoeda(diferenca)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitulo}>Por Jogo</Text>
        {jogos.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum jogo com gastos lançados ainda.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colJogo, sharedStyles.headerCell]}>Jogo</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Previsto</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Efetuado</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Diferença</Text>
            </View>
            {jogos.map((j, i) => {
              const diferenca = j.previsto - j.efetuado;
              return (
                <View style={sharedStyles.tableRow} key={i} wrap={false}>
                  <View style={styles.colJogo}>
                    <Text style={styles.jogoConfronto}>{j.confronto}</Text>
                    <Text style={styles.jogoSub}>
                      {j.competicao} · {formatDataBr(j.data)}
                    </Text>
                  </View>
                  <Text style={styles.colValor}>{formatMoeda(j.previsto)}</Text>
                  <Text style={styles.colValor}>{formatMoeda(j.efetuado)}</Text>
                  <Text style={diferenca < 0 ? styles.colValorNegativo : styles.colValor}>
                    {formatMoeda(diferenca)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <AssinaturasBlock assinatura1={assinatura1} assinatura2={assinatura2} />

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
