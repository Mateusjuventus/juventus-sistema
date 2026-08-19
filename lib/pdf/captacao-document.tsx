import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relação de Captação/Avaliação — banco dos candidatos em teste (ver
 * docs/superpowers/specs/2026-08-19-captacao-base-design.md). Paisagem (landscape) porque são 10
 * colunas de informação — no retrato (A4 normal) a tabela ficaria espremida ou cortaria texto.
 * Segue o mesmo desenho dos outros documentos oficiais do sistema (ver
 * `lib/pdf/veiculos-liberacao-document.tsx`).
 */

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  logo: { width: 40, height: 45, objectFit: "contain", marginRight: 10 },
  tituloBox: { flex: 1 },
  tituloTexto: {
    fontSize: 14,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  subtituloTexto: { fontSize: 8.5, color: "#525252", marginTop: 2 },

  tabelaHeader: { flexDirection: "row", backgroundColor: CORES.grenaEscuro, paddingVertical: 5 },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    minHeight: 18,
  },
  headerCell: { fontSize: 7, fontWeight: 700, color: "#ffffff", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellMuted: { fontSize: 8, color: "#a3a3a3" },

  colNum: { width: 26, textAlign: "center", paddingHorizontal: 2 },
  colData: { width: 58, paddingHorizontal: 3 },
  colNome: { flex: 1.6, paddingHorizontal: 3 },
  colNascimento: { width: 58, paddingHorizontal: 3 },
  colPosicao: { width: 78, paddingHorizontal: 3 },
  colCategoria: { width: 52, paddingHorizontal: 3 },
  colCidade: { flex: 1, paddingHorizontal: 3 },
  colIndicacao: { flex: 1, paddingHorizontal: 3 },
  colAlojamento: { width: 60, textAlign: "center", paddingHorizontal: 3 },
  colStatus: { width: 92, paddingHorizontal: 3 },

  resumoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderLeftWidth: 3,
    borderLeftColor: CORES.dourado,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  resumoTexto: { fontSize: 8.5, color: CORES.grenaEscuro, fontWeight: 700 },
});

export interface CaptacaoPdfLinha {
  numero: number;
  dataInicio: string | null;
  nome: string;
  nascimento: string | null;
  posicao: string | null;
  categoria: string | null;
  cidade: string | null;
  indicacao: string | null;
  desejaAlojamento: boolean;
  status: string;
}

export function CaptacaoDocument({
  juventusLogoSrc,
  emitidoEm,
  candidatos,
}: {
  juventusLogoSrc: LogoSrc;
  emitidoEm: string;
  candidatos: CaptacaoPdfLinha[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={sharedStyles.page}>
        <View style={styles.headerRow}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
          <View style={styles.tituloBox}>
            <Text style={styles.tituloTexto}>Relação de Captação/Avaliação</Text>
            <Text style={styles.subtituloTexto}>Futebol de Base · Emitido em {formatDataBr(emitidoEm)}</Text>
          </View>
        </View>

        <View style={styles.resumoBar}>
          <Text style={styles.resumoTexto}>
            {candidatos.length} candidato{candidatos.length === 1 ? "" : "s"} nesta relação
          </Text>
        </View>

        <View style={styles.tabelaHeader} fixed>
          <Text style={[styles.colNum, styles.headerCell]}>Nº</Text>
          <Text style={[styles.colData, styles.headerCell]}>Início</Text>
          <Text style={[styles.colNome, styles.headerCell]}>Atleta</Text>
          <Text style={[styles.colNascimento, styles.headerCell]}>Nascimento</Text>
          <Text style={[styles.colPosicao, styles.headerCell]}>Posição</Text>
          <Text style={[styles.colCategoria, styles.headerCell]}>Categoria</Text>
          <Text style={[styles.colCidade, styles.headerCell]}>Cidade</Text>
          <Text style={[styles.colIndicacao, styles.headerCell]}>Indicação</Text>
          <Text style={[styles.colAlojamento, styles.headerCell]}>Alojamento</Text>
          <Text style={[styles.colStatus, styles.headerCell]}>Status</Text>
        </View>
        {candidatos.map((c) => (
          <View style={styles.tabelaLinha} key={c.numero} wrap={false}>
            <Text style={[styles.colNum, styles.cell]}>{c.numero}</Text>
            <Text style={[styles.colData, c.dataInicio ? styles.cell : styles.cellMuted]}>
              {c.dataInicio ? formatDataBr(c.dataInicio) : "—"}
            </Text>
            <Text style={[styles.colNome, styles.cell]}>{c.nome}</Text>
            <Text style={[styles.colNascimento, c.nascimento ? styles.cell : styles.cellMuted]}>
              {c.nascimento ? formatDataBr(c.nascimento) : "—"}
            </Text>
            <Text style={[styles.colPosicao, c.posicao ? styles.cell : styles.cellMuted]}>{c.posicao ?? "—"}</Text>
            <Text style={[styles.colCategoria, c.categoria ? styles.cell : styles.cellMuted]}>
              {c.categoria ?? "—"}
            </Text>
            <Text style={[styles.colCidade, c.cidade ? styles.cell : styles.cellMuted]}>{c.cidade ?? "—"}</Text>
            <Text style={[styles.colIndicacao, c.indicacao ? styles.cell : styles.cellMuted]}>
              {c.indicacao ?? "—"}
            </Text>
            <Text style={[styles.colAlojamento, styles.cell]}>{c.desejaAlojamento ? "Sim" : "Não"}</Text>
            <Text style={[styles.colStatus, styles.cell]}>{c.status}</Text>
          </View>
        ))}

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
