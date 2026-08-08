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
  colValor: { width: 74, textAlign: "right" },
  headerCell: { fontSize: 6.5, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellJogos: { fontSize: 6.5, color: "#a3a3a3", marginTop: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 4 },
  statBox: {
    width: "31.5%",
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  statLabel: { fontSize: 7, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: 0.5 },
  statValor: { fontSize: 13, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 3 },
  statValorNegativo: { color: "#b91c1c" },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface DespesaAvulsaPdfItem {
  data: string | null;
  descricao: string | null;
  valorPrevisto: number;
  valorEfetuado: number | null;
  /** Confrontos dos jogos relacionados, já formatados (ex: "Juventus x Adversário (12/08)") — só
   * texto auxiliar, não é usado em nenhum cálculo. */
  jogosRelacionados: string[];
}

export interface DespesaAvulsaPdfCategoria {
  nome: string;
  despesas: DespesaAvulsaPdfItem[];
}

/**
 * PDF "Relatório de Despesas Avulsas" — só as despesas avulsas (não ligadas a nenhum jogo
 * específico), pedido explicitamente pelo Mateus como um relatório dedicado além da seção que
 * elas também ganham no relatório geral (`lib/pdf/relatorio-financeiro-document.tsx`). Nome
 * escolhido pra não colidir com o "Relatório Avulso" já existente em `/relatorios/avulso`
 * (lista de pessoal sob medida — outra coisa). Ver
 * docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md. Sem cabeçalho de confronto (não tem
 * um jogo "dono") — cabeçalho genérico, mesmo padrão do relatório geral.
 */
export function DespesasAvulsasDocument({
  juventusLogoSrc,
  geradoEm,
  categorias,
  totalPrevisto,
  totalEfetuado,
  assinatura1,
  assinatura2,
  departamento,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  categorias: DespesaAvulsaPdfCategoria[];
  totalPrevisto: number;
  totalEfetuado: number;
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
  departamento: "profissional" | "base";
}) {
  const totalDiferenca = totalPrevisto - totalEfetuado;

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento={departamento} />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relatório de Despesas Avulsas</Text>
        <Text style={styles.subtitulo}>Despesas não ligadas a um jogo específico</Text>

        {categorias.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma despesa avulsa lançada ainda.</Text>
        ) : (
          categorias.map((c) => {
            const subtotalPrevisto = c.despesas.reduce((soma, d) => soma + d.valorPrevisto, 0);
            return (
              <View style={styles.categoriaBox} key={c.nome} wrap={false}>
                <View style={styles.categoriaHeaderRow}>
                  <Text style={styles.categoriaTitulo}>{c.nome}</Text>
                  <Text style={styles.categoriaSubtotal}>{formatMoeda(subtotalPrevisto)}</Text>
                </View>
                <View style={styles.tabela}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.colData, styles.headerCell]}>Data</Text>
                    <Text style={[styles.colDescricao, styles.headerCell]}>Descrição</Text>
                    <Text style={[styles.colValor, styles.headerCell]}>Previsto</Text>
                    <Text style={[styles.colValor, styles.headerCell]}>Efetuado</Text>
                  </View>
                  {c.despesas.map((d, i) => (
                    <View style={styles.linha} key={i}>
                      <Text style={[styles.colData, styles.cell]}>{formatDataBr(d.data)}</Text>
                      <View style={styles.colDescricao}>
                        <Text style={styles.cell}>{d.descricao ?? "—"}</Text>
                        {d.jogosRelacionados.length > 0 ? (
                          <Text style={styles.cellJogos}>Jogos: {d.jogosRelacionados.join(", ")}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.colValor, styles.cell]}>{formatMoeda(d.valorPrevisto)}</Text>
                      <Text style={[styles.colValor, styles.cell]}>
                        {d.valorEfetuado === null ? "—" : formatMoeda(d.valorEfetuado)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

        {categorias.length > 0 ? (
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
        ) : null}

        <AssinaturasBlock assinatura1={assinatura1} assinatura2={assinatura2} />

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
