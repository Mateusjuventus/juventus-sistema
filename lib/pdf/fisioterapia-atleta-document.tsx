import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatCarimbo, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relatório individual de Fisioterapia (Departamento Médico, Futebol Profissional) — ver
 * docs/superpowers/specs/2026-09-30-fisioterapia-design.md, seção 4. Reaproveita os componentes e
 * cores já padronizados em `logistica-shared.tsx` (cabeçalho com escudo, `CORES`, `DocumentoFooter`,
 * `formatDataBr`) — sem bloco de assinatura (fora de escopo desta rodada).
 */

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  foto: { width: 64, height: 80, borderRadius: 3, objectFit: "cover", borderWidth: 0.75, borderColor: "#c4c4c4" },
  fotoPlaceholder: {
    width: 64,
    height: 80,
    borderRadius: 3,
    backgroundColor: "#f5f5f5",
    borderWidth: 0.75,
    borderColor: "#c4c4c4",
  },
  identidade: { flex: 1 },
  nomeTexto: { fontSize: 15, fontWeight: 700, color: CORES.grenaEscuro },
  apelidoTexto: { fontSize: 9, color: "#525252", marginTop: 2 },
  detalheTexto: { fontSize: 9, color: "#525252", marginTop: 2 },
  logo: { width: 46, height: 54, objectFit: "contain" },
  tituloTexto: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 14,
  },
  colData: { width: "12%" },
  colDataFim: { width: "12%" },
  colDias: { width: "14%" },
  colDescricaoLesao: { width: "34%" },
  colObs: { width: "28%" },
  colTipo: { width: "16%" },
  colDataQueixa: { width: "14%" },
  colDescricaoQueixa: { width: "70%" },
  colDataAtend: { width: "14%" },
  colDescricaoAtend: { width: "56%" },
  colLesaoLigada: { width: "30%" },
  cell: { fontSize: 8, color: "#262626" },
});

export interface FisioterapiaRelatorioLesao {
  dataInicio: string;
  dataFim: string | null;
  diasAfastados: number;
  descricao: string;
  observacoes: string | null;
}

export interface FisioterapiaRelatorioQueixa {
  data: string;
  tipo: string;
  descricao: string;
}

export interface FisioterapiaRelatorioAtendimento {
  data: string;
  descricao: string;
  lesaoDescricao: string | null;
}

export interface FisioterapiaRelatorioAtleta {
  nome: string;
  apelido: string | null;
  dataNascimento: string | null;
  posicao: string | null;
}

export function FisioterapiaAtletaDocument({
  juventusLogoSrc,
  fotoSrc,
  atleta,
  lesoes,
  queixas,
  atendimentos,
  emitidoEm,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  atleta: FisioterapiaRelatorioAtleta;
  lesoes: FisioterapiaRelatorioLesao[];
  queixas: FisioterapiaRelatorioQueixa[];
  atendimentos: FisioterapiaRelatorioAtendimento[];
  emitidoEm: Date;
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.headerRow}>
          {fotoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.foto} src={fotoSrc as string} />
          ) : (
            <View style={styles.fotoPlaceholder} />
          )}
          <View style={styles.identidade}>
            <Text style={styles.nomeTexto}>{atleta.nome}</Text>
            {atleta.apelido ? <Text style={styles.apelidoTexto}>&ldquo;{atleta.apelido}&rdquo;</Text> : null}
            <Text style={styles.detalheTexto}>
              {atleta.posicao ?? "—"} · Nasc. {formatDataBr(atleta.dataNascimento)}
            </Text>
          </View>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
        </View>

        <Text style={styles.tituloTexto}>Relatório de Fisioterapia</Text>

        <Text style={sharedStyles.sectionTitulo}>Lesões</Text>
        {lesoes.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma lesão registrada.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colData, sharedStyles.headerCell]}>Início</Text>
              <Text style={[styles.colDataFim, sharedStyles.headerCell]}>Fim</Text>
              <Text style={[styles.colDias, sharedStyles.headerCell]}>Dias afastado</Text>
              <Text style={[styles.colDescricaoLesao, sharedStyles.headerCell]}>Descrição</Text>
              <Text style={[styles.colObs, sharedStyles.headerCell]}>Observações</Text>
            </View>
            {lesoes.map((lesao, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={[styles.colData, styles.cell]}>{formatDataBr(lesao.dataInicio)}</Text>
                <Text style={[styles.colDataFim, styles.cell]}>{lesao.dataFim ? formatDataBr(lesao.dataFim) : "Em andamento"}</Text>
                <Text style={[styles.colDias, styles.cell]}>{lesao.diasAfastados}</Text>
                <Text style={[styles.colDescricaoLesao, styles.cell]}>{lesao.descricao}</Text>
                <Text style={[styles.colObs, styles.cell]}>{lesao.observacoes ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={sharedStyles.sectionTitulo}>Queixas</Text>
        {queixas.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma queixa registrada.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colDataQueixa, sharedStyles.headerCell]}>Data</Text>
              <Text style={[styles.colTipo, sharedStyles.headerCell]}>Tipo</Text>
              <Text style={[styles.colDescricaoQueixa, sharedStyles.headerCell]}>Descrição</Text>
            </View>
            {queixas.map((queixa, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={[styles.colDataQueixa, styles.cell]}>{formatDataBr(queixa.data)}</Text>
                <Text style={[styles.colTipo, styles.cell]}>{queixa.tipo}</Text>
                <Text style={[styles.colDescricaoQueixa, styles.cell]}>{queixa.descricao}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={sharedStyles.sectionTitulo}>Atendimentos</Text>
        {atendimentos.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum atendimento registrado.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colDataAtend, sharedStyles.headerCell]}>Data</Text>
              <Text style={[styles.colDescricaoAtend, sharedStyles.headerCell]}>Descrição</Text>
              <Text style={[styles.colLesaoLigada, sharedStyles.headerCell]}>Lesão ligada</Text>
            </View>
            {atendimentos.map((atendimento, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={[styles.colDataAtend, styles.cell]}>{formatDataBr(atendimento.data)}</Text>
                <Text style={[styles.colDescricaoAtend, styles.cell]}>{atendimento.descricao}</Text>
                <Text style={[styles.colLesaoLigada, styles.cell]}>{atendimento.lesaoDescricao ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 7, color: "#a3a3a3", textAlign: "center", marginTop: 10 }}>
          Emitido em {formatCarimbo(emitidoEm)}
        </Text>
        <DocumentoFooter geradoEm={emitidoEm} />
      </Page>
    </Document>
  );
}
