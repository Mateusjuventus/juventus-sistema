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
  headerLogo: { width: 52, height: 60, alignSelf: "center", objectFit: "contain", marginTop: 2 },
  titulo: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 8,
    marginBottom: 18,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
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
  barraRow: { flexDirection: "row", alignItems: "center", paddingVertical: 3, paddingHorizontal: 8 },
  barraLabel: { width: 46, fontSize: 8, fontWeight: 700, color: "#404040" },
  barraTrilha: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EEF0F2",
    marginHorizontal: 8,
    overflow: "hidden",
  },
  barraPreenchida: { height: 7, borderRadius: 4, backgroundColor: CORES.grena },
  barraPreenchidaDestaque: { backgroundColor: CORES.dourado },
  barraValor: { width: 68, fontSize: 8, fontWeight: 700, color: "#1f1f1f", textAlign: "right" },
  colNome: { flex: 1.6 },
  colFuncao: { flex: 1.1 },
  colCategoria: { flex: 1.1 },
  colValor: { width: 76, textAlign: "right" },
  colDespesa: { flex: 1.8 },
  despesaTitulo: { fontSize: 8, fontWeight: 700, color: "#1f1f1f" },
  despesaSub: { fontSize: 7, color: "#737373", marginTop: 1 },
  legenda: { fontSize: 7.5, color: "#a3a3a3", marginTop: 2, marginBottom: 2 },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface RelatorioGeralBaseCategoria {
  label: string;
  valor: number;
}

export interface RelatorioGeralBaseComissao {
  nome: string;
  funcao: string;
  categorias: string;
  valorSalario: number | null;
}

export interface RelatorioGeralBaseAtleta {
  nome: string;
  categoria: string;
  valorAjudaCusto: number;
}

export interface RelatorioGeralBaseDespesa {
  categoria: string;
  tipo: string;
  descricao: string | null;
  data: string | null;
  valor: number;
  efetuado: boolean;
}

/**
 * Relatório do Gasto Geral da Base (aba "Geral da Base" de `/base/financeiro`) — totalmente
 * separado do Relatório de Prestação de Contas de jogos (`relatorio-financeiro-document.tsx`), por
 * decisão explícita (ver docs/superpowers/specs/2026-08-19-financeiro-base-design.md). Mesmo
 * padrão visual (departamento, assinaturas, rodapé), conteúdo diferente: salário da Comissão
 * Técnica + ajuda de custo dos Atletas + despesas avulsas, com a mesma quebra por categoria em
 * barras da tela (aqui como barras horizontais simples, já que o PDF não tem SVG).
 */
export function RelatorioGeralBaseDocument({
  juventusLogoSrc,
  geradoEm,
  custoMensalFixo,
  despesasTotal,
  totalGeral,
  categorias,
  comissao,
  atletas,
  despesas,
  assinatura1,
  assinatura2,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  custoMensalFixo: number;
  despesasTotal: number;
  totalGeral: number;
  categorias: RelatorioGeralBaseCategoria[];
  comissao: RelatorioGeralBaseComissao[];
  atletas: RelatorioGeralBaseAtleta[];
  despesas: RelatorioGeralBaseDespesa[];
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
}) {
  const maiorValor = Math.max(...categorias.map((c) => c.valor), 0);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento="base" />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Gasto Geral da Base</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Custo mensal fixo</Text>
            <Text style={styles.statValor}>{formatMoeda(custoMensalFixo)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Despesas avulsas</Text>
            <Text style={styles.statValor}>{formatMoeda(despesasTotal)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total geral da Base</Text>
            <Text style={styles.statValor}>{formatMoeda(totalGeral)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitulo}>Por Categoria</Text>
        <Text style={styles.legenda}>
          Quem atua em mais de uma categoria tem o salário dividido igual entre elas aqui.
        </Text>
        <View style={sharedStyles.table}>
          {categorias.map((c) => {
            const largura = maiorValor > 0 ? Math.max((c.valor / maiorValor) * 100, c.valor > 0 ? 2 : 0) : 0;
            const destaque = c.valor === maiorValor && maiorValor > 0;
            return (
              <View style={styles.barraRow} key={c.label} wrap={false}>
                <Text style={styles.barraLabel}>{c.label}</Text>
                <View style={styles.barraTrilha}>
                  <View
                    style={[
                      styles.barraPreenchida,
                      destaque ? styles.barraPreenchidaDestaque : {},
                      { width: `${largura}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barraValor}>{formatMoeda(c.valor)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitulo}>Comissão Técnica</Text>
        {comissao.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum integrante da Comissão Técnica cadastrado ainda.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
              <Text style={[styles.colFuncao, sharedStyles.headerCell]}>Função</Text>
              <Text style={[styles.colCategoria, sharedStyles.headerCell]}>Categoria(s)</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Salário mensal</Text>
            </View>
            {comissao.map((c, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colNome}>{c.nome}</Text>
                <Text style={styles.colFuncao}>{c.funcao}</Text>
                <Text style={styles.colCategoria}>{c.categorias}</Text>
                <Text style={styles.colValor}>{c.valorSalario ? formatMoeda(c.valorSalario) : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitulo}>Atletas</Text>
        <Text style={styles.legenda}>Só aparecem aqui os atletas com ajuda de custo cadastrada.</Text>
        {atletas.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum atleta com ajuda de custo cadastrada.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
              <Text style={[styles.colCategoria, sharedStyles.headerCell]}>Categoria</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Ajuda de custo</Text>
            </View>
            {atletas.map((a, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colNome}>{a.nome}</Text>
                <Text style={styles.colCategoria}>{a.categoria}</Text>
                <Text style={styles.colValor}>{formatMoeda(a.valorAjudaCusto)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitulo}>Despesas Avulsas da Base</Text>
        {despesas.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma despesa avulsa lançada ainda.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colDespesa, sharedStyles.headerCell]}>Despesa</Text>
              <Text style={[styles.colCategoria, sharedStyles.headerCell]}>Categoria</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Valor</Text>
            </View>
            {despesas.map((d, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <View style={styles.colDespesa}>
                  <Text style={styles.despesaTitulo}>{d.tipo}</Text>
                  <Text style={styles.despesaSub}>
                    {d.descricao ?? "Sem descrição"} · {formatDataBr(d.data)}
                  </Text>
                </View>
                <Text style={styles.colCategoria}>{d.categoria}</Text>
                <Text style={styles.colValor}>
                  {formatMoeda(d.valor)}
                  {d.efetuado ? "" : " (prev.)"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <AssinaturasBlock assinatura1={assinatura1} assinatura2={assinatura2} />

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
