import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatCarimbo, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relatório geral (consolidado) de Fisioterapia — visão do elenco inteiro: quem está com lesão
 * ativa agora, total de dias afastados (soma de todas as lesões) e a queixa mais recente de cada
 * atleta. Só entram atletas com pelo menos um registro (lesão, queixa ou atendimento) — ver
 * docs/superpowers/specs/2026-09-30-fisioterapia-design.md, seção 4.
 */

const styles = StyleSheet.create({
  headerLogo: { width: 50, height: 62, alignSelf: "center", objectFit: "contain", marginTop: 2 },
  titulo: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 14 },
  colNome: { width: "32%" },
  colTratamento: { width: "16%" },
  colDias: { width: "16%" },
  colQueixa: { width: "18%" },
  colAtendimentos: { width: "18%" },
  cell: { fontSize: 8, color: "#262626" },
  cellNome: { fontSize: 8.5, fontWeight: 700, color: "#1f1f1f" },
  emTratamentoTag: { fontSize: 7.5, fontWeight: 700, color: "#b91c1c" },
  historicoBox: {
    borderWidth: 0.75,
    borderStyle: "dashed",
    borderColor: "#d4d4d4",
    backgroundColor: "#fafafa",
    padding: 8,
    marginBottom: 14,
  },
  historicoLabel: { fontSize: 9, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: 0.5 },
  historicoNota: { fontSize: 7.5, color: "#a3a3a3", marginTop: 2 },
  historicoItem: { marginTop: 8 },
  historicoItemComDivisor: { marginTop: 8, borderTopWidth: 0.5, borderTopColor: "#e5e5e5", paddingTop: 8 },
  historicoTitulo: { fontSize: 8.5, fontWeight: 700, color: "#404040" },
  historicoResumo: { fontSize: 8, color: "#525252", marginTop: 2, lineHeight: 1.4 },
});

export interface FisioterapiaRelatorioGeralLinha {
  nome: string;
  emTratamento: boolean;
  totalDiasAfastados: number;
  ultimaQueixaData: string | null;
  totalAtendimentos: number;
}

export interface FisioterapiaRelatorioHistoricoItem {
  titulo: string;
  resumo: string;
}

export function FisioterapiaRelatorioGeralDocument({
  juventusLogoSrc,
  historicoGeral,
  linhas,
  geradoEm,
}: {
  juventusLogoSrc: LogoSrc;
  historicoGeral: FisioterapiaRelatorioHistoricoItem[];
  linhas: FisioterapiaRelatorioGeralLinha[];
  geradoEm: Date;
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relatório Geral de Fisioterapia</Text>
        <Text style={styles.subtitulo}>Futebol Profissional</Text>

        {historicoGeral.length > 0 ? (
          <View style={styles.historicoBox} wrap={false}>
            <Text style={styles.historicoLabel}>Histórico anterior ao sistema</Text>
            <Text style={styles.historicoNota}>
              Importado do relatório em papel do departamento — sem data exata de cada evento, só como referência.
            </Text>
            {historicoGeral.map((item, i) => (
              <View style={i === 0 ? styles.historicoItem : styles.historicoItemComDivisor} key={i}>
                <Text style={styles.historicoTitulo}>{item.titulo}</Text>
                <Text style={styles.historicoResumo}>{item.resumo}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {linhas.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum atleta com registro de Fisioterapia ainda.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colNome, sharedStyles.headerCell]}>Atleta</Text>
              <Text style={[styles.colTratamento, sharedStyles.headerCell]}>Em tratamento</Text>
              <Text style={[styles.colDias, sharedStyles.headerCell]}>Dias afastado (total)</Text>
              <Text style={[styles.colQueixa, sharedStyles.headerCell]}>Última queixa</Text>
              <Text style={[styles.colAtendimentos, sharedStyles.headerCell]}>Atendimentos</Text>
            </View>
            {linhas.map((linha, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={[styles.colNome, styles.cellNome]}>{linha.nome}</Text>
                <Text style={[styles.colTratamento, linha.emTratamento ? styles.emTratamentoTag : styles.cell]}>
                  {linha.emTratamento ? "Sim" : "Não"}
                </Text>
                <Text style={[styles.colDias, styles.cell]}>{linha.totalDiasAfastados}</Text>
                <Text style={[styles.colQueixa, styles.cell]}>{formatDataBr(linha.ultimaQueixaData)}</Text>
                <Text style={[styles.colAtendimentos, styles.cell]}>{linha.totalAtendimentos}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 7, color: "#a3a3a3", textAlign: "center", marginTop: 10 }}>
          Emitido em {formatCarimbo(geradoEm)}
        </Text>
        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
