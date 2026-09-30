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
  historicoBox: {
    borderWidth: 0.75,
    borderStyle: "dashed",
    borderColor: "#d4d4d4",
    backgroundColor: "#fafafa",
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  historicoLabel: { fontSize: 9, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: 0.5 },
  historicoNota: { fontSize: 7.5, color: "#a3a3a3", marginTop: 2 },
  historicoItem: { marginTop: 8 },
  historicoItemComDivisor: { marginTop: 8, borderTopWidth: 0.5, borderTopColor: "#e5e5e5", paddingTop: 8 },
  historicoTitulo: { fontSize: 8.5, fontWeight: 700, color: "#404040" },
  historicoResumo: { fontSize: 8, color: "#525252", marginTop: 2, lineHeight: 1.4 },
});

export interface FisioterapiaRelatorioHistoricoItem {
  titulo: string;
  resumo: string;
}

export interface FisioterapiaRelatorioLesao {
  dataInicio: string | null;
  dataFim: string | null;
  diasAfastados: number | null;
  descricao: string;
  observacoes: string | null;
}

export interface FisioterapiaRelatorioQueixa {
  data: string | null;
  tipo: string;
  descricao: string;
}

export interface FisioterapiaRelatorioAtendimento {
  data: string | null;
  descricao: string;
  lesaoDescricao: string | null;
}

export interface FisioterapiaRelatorioAtleta {
  nome: string;
  apelido: string | null;
  dataNascimento: string | null;
  posicao: string | null;
}

export interface FisioterapiaAtletaConteudoProps {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  atleta: FisioterapiaRelatorioAtleta;
  historico: FisioterapiaRelatorioHistoricoItem[];
  lesoes: FisioterapiaRelatorioLesao[];
  queixas: FisioterapiaRelatorioQueixa[];
  atendimentos: FisioterapiaRelatorioAtendimento[];
  emitidoEm: Date;
}

/**
 * Conteúdo de uma página de Fisioterapia — extraído do `FisioterapiaAtletaDocument` pra ser
 * reaproveitado também pelo Relatório Completo (todos os atletas, um por página, mesmo `<Document>`
 * — ver `fisioterapia-relatorio-completo-document.tsx`), sem duplicar o JSX.
 */
export function FisioterapiaAtletaConteudo({
  juventusLogoSrc,
  fotoSrc,
  atleta,
  historico,
  lesoes,
  queixas,
  atendimentos,
  emitidoEm,
}: FisioterapiaAtletaConteudoProps) {
  return (
    <>
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

        {historico.length > 0 ? (
          <View style={styles.historicoBox} wrap={false}>
            <Text style={styles.historicoLabel}>Histórico</Text>
            <Text style={styles.historicoNota}>
              Importado do relatório em papel do departamento — sem data exata de cada evento, só como referência.
            </Text>
            {historico.map((item, i) => (
              <View style={i === 0 ? styles.historicoItem : styles.historicoItemComDivisor} key={i}>
                <Text style={styles.historicoResumo}>{item.resumo}</Text>
              </View>
            ))}
          </View>
        ) : null}

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
                <Text style={[styles.colDataFim, styles.cell]}>
                  {!lesao.dataInicio ? "—" : lesao.dataFim ? formatDataBr(lesao.dataFim) : "Em andamento"}
                </Text>
                <Text style={[styles.colDias, styles.cell]}>{lesao.diasAfastados ?? "—"}</Text>
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
    </>
  );
}

/** Documento individual (1 atleta, 1 página) — mesmo molde de sempre, agora só uma casca fina em
 * torno de `FisioterapiaAtletaConteudo`. */
export function FisioterapiaAtletaDocument(props: FisioterapiaAtletaConteudoProps) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <FisioterapiaAtletaConteudo {...props} />
      </Page>
    </Document>
  );
}
