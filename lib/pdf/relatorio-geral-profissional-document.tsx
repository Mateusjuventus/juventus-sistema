import { Document, Page, Text, View, Image, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import {
  AssinaturasBlock,
  type AssinaturaInfo,
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
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
  colNome: { flex: 1.6 },
  colFuncao: { flex: 1.1 },
  colTipo: { flex: 1.1 },
  colValor: { width: 76, textAlign: "right" },
  legenda: { fontSize: 7.5, color: "#a3a3a3", marginTop: 2, marginBottom: 2 },
  donutLinha: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  donutLegenda: { flex: 1, marginLeft: 22 },
  donutLegendaLinha: { flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  donutBolinha: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  donutRotulo: { flex: 1, fontSize: 8.5, color: "#404040" },
  donutPct: { width: 30, fontSize: 8, color: "#a3a3a3", textAlign: "right" },
  donutValor: { width: 66, fontSize: 8.5, fontWeight: 700, color: "#1f1f1f", textAlign: "right" },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Caminho SVG de uma fatia de donut — mesma técnica (e mesmo motivo) de
 * `relatorio-geral-base-document.tsx`: ver o comentário lá. */
function caminhoFatiaDonut(
  cx: number,
  cy: number,
  rExterno: number,
  rInterno: number,
  fracaoInicioBruta: number,
  fracaoFimBruta: number,
): string {
  const fracaoInicio = fracaoInicioBruta;
  const fracaoFim = Math.min(fracaoFimBruta, fracaoInicio + 0.9998);
  const ponto = (r: number, fracao: number) => {
    const angulo = -Math.PI / 2 + fracao * 2 * Math.PI;
    return [cx + r * Math.cos(angulo), cy + r * Math.sin(angulo)];
  };
  const largeArc = fracaoFim - fracaoInicio > 0.5 ? 1 : 0;
  const [x1, y1] = ponto(rExterno, fracaoInicio);
  const [x2, y2] = ponto(rExterno, fracaoFim);
  const [x3, y3] = ponto(rInterno, fracaoFim);
  const [x4, y4] = ponto(rInterno, fracaoInicio);
  return [
    `M ${x1} ${y1}`,
    `A ${rExterno} ${rExterno} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInterno} ${rInterno} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

export interface RelatorioGeralProfissionalFatia {
  label: string;
  valor: number;
  cor: string;
}

export interface RelatorioGeralProfissionalComissao {
  nome: string;
  funcao: string;
  valorSalario: number | null;
}

export interface RelatorioGeralProfissionalAtleta {
  nome: string;
  tipoPagamento: string;
  valor: number | null;
}

/**
 * Relatório da aba "Geral" de `/financeiro` (Profissional) — espelha
 * `relatorio-geral-base-document.tsx`, mas mais simples: sem quebra "por categoria" (o Profissional
 * não tem categorias de idade) e sem despesas avulsas (ficam só no Relatório de Prestação de Contas
 * de jogos, `relatorio-financeiro-document.tsx`). Ver docs/superpowers/specs/2026-10-16-financeiro-
 * contrato-design.md.
 */
export function RelatorioGeralProfissionalDocument({
  juventusLogoSrc,
  geradoEm,
  custoComissao,
  custoAtletas,
  totalGeral,
  composicao,
  comissao,
  atletas,
  assinatura1,
  assinatura2,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  custoComissao: number;
  custoAtletas: number;
  totalGeral: number;
  composicao: RelatorioGeralProfissionalFatia[];
  comissao: RelatorioGeralProfissionalComissao[];
  atletas: RelatorioGeralProfissionalAtleta[];
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
}) {
  const rExterno = 30;
  const rInterno = 15;
  const cx = 32;
  const cy = 32;
  let acumuladoFracao = 0;
  const fatiasComFracao = composicao
    .filter((f) => f.valor > 0)
    .map((f) => {
      const fracao = totalGeral > 0 ? f.valor / totalGeral : 0;
      const inicio = acumuladoFracao;
      acumuladoFracao += fracao;
      return { ...f, inicio, fim: acumuladoFracao };
    });

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento="profissional" />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Custo com Comissão Técnica e Atletas</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Comissão Técnica</Text>
            <Text style={styles.statValor}>{formatMoeda(custoComissao)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Atletas</Text>
            <Text style={styles.statValor}>{formatMoeda(custoAtletas)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total geral</Text>
            <Text style={styles.statValor}>{formatMoeda(totalGeral)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitulo}>Composição do Gasto</Text>
        <View style={styles.donutLinha} wrap={false}>
          <Svg width={64} height={64} viewBox="0 0 64 64">
            {fatiasComFracao.map((f) => (
              <Path
                key={f.label}
                d={caminhoFatiaDonut(cx, cy, rExterno, rInterno, f.inicio, f.fim)}
                fill={f.cor}
              />
            ))}
          </Svg>
          <View style={styles.donutLegenda}>
            {composicao.map((f) => {
              const pct = totalGeral > 0 ? Math.round((f.valor / totalGeral) * 100) : 0;
              return (
                <View style={styles.donutLegendaLinha} key={f.label}>
                  <View style={[styles.donutBolinha, { backgroundColor: f.cor }]} />
                  <Text style={styles.donutRotulo}>{f.label}</Text>
                  <Text style={styles.donutPct}>{pct}%</Text>
                  <Text style={styles.donutValor}>{formatMoeda(f.valor)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitulo}>Comissão Técnica</Text>
        {comissao.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum integrante da Comissão Técnica cadastrado ainda.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
              <Text style={[styles.colFuncao, sharedStyles.headerCell]}>Função</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Salário mensal</Text>
            </View>
            {comissao.map((c, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colNome}>{c.nome}</Text>
                <Text style={styles.colFuncao}>{c.funcao}</Text>
                <Text style={styles.colValor}>{c.valorSalario ? formatMoeda(c.valorSalario) : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitulo}>Atletas</Text>
        <Text style={styles.legenda}>
          Todo atleta cadastrado aparece aqui — &ldquo;—&rdquo; quando não há contrato cadastrado.
        </Text>
        {atletas.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum atleta cadastrado ainda.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
              <Text style={[styles.colTipo, sharedStyles.headerCell]}>Tipo</Text>
              <Text style={[styles.colValor, sharedStyles.headerCell]}>Valor</Text>
            </View>
            {atletas.map((a, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colNome}>{a.nome}</Text>
                <Text style={styles.colTipo}>{a.tipoPagamento}</Text>
                <Text style={styles.colValor}>{a.valor ? formatMoeda(a.valor) : "—"}</Text>
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
