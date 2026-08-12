import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relação de Placas — o documento que o clube manda antes de jogo fora pra portaria/segurança do
 * estádio liberar a entrada dos carros da delegação.
 *
 * É uma RELAÇÃO, não um ofício: sem parágrafo de abertura e sem destinatário (pedido do Mateus em
 * 12/08). Quando o documento é atrelado a um jogo, o que aparece no lugar do texto são os dados do
 * jogo em bloco de label/valor — jogo, data, horário e local. Sem nada preenchido, fica só o título
 * e a tabela, que é o suficiente pra quem recebe.
 *
 * Segue o desenho dos outros documentos oficiais do sistema (ver `lib/pdf/termo-retirada-document.tsx`).
 */

const styles = StyleSheet.create({
  logoBox: { alignItems: "center", marginBottom: 4 },
  logo: { width: 46, height: 52, objectFit: "contain" },
  tituloBar: {
    backgroundColor: CORES.grena,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 10,
  },
  tituloTexto: {
    fontSize: 12,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  subtituloTexto: { fontSize: 8, color: "#f5e6ee", textAlign: "center", marginTop: 2 },

  sectionBar: {
    backgroundColor: "#f5f5f5",
    borderLeftWidth: 3,
    borderLeftColor: CORES.dourado,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionBarTexto: { fontSize: 8.5, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },

  infoRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  infoLabelCell: { width: 76, backgroundColor: "#fafafa", padding: 4 },
  infoValorCell: { flex: 1, padding: 4 },
  infoLabelTexto: { fontSize: 7.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  infoValorTexto: { fontSize: 9, color: "#262626" },

  tabelaHeader: { flexDirection: "row", backgroundColor: CORES.grenaEscuro, paddingVertical: 4 },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    minHeight: 18,
  },
  headerCell: { fontSize: 7, fontWeight: 700, color: "#ffffff", textTransform: "uppercase" },
  cell: { fontSize: 8.5, color: "#262626" },
  cellMuted: { fontSize: 8.5, color: "#a3a3a3" },
  placaCell: { fontSize: 9.5, fontWeight: 700, color: CORES.grenaEscuro, letterSpacing: 0.5 },

  colNum: { width: 20, textAlign: "center" },
  colCondutor: { flex: 1, paddingHorizontal: 4 },
  colDocumento: { width: 88, paddingHorizontal: 4 },
  colPlaca: { width: 72, paddingHorizontal: 4 },
  colVeiculo: { width: 120, paddingHorizontal: 4 },

  observacoesTexto: { fontSize: 9, color: "#404040", marginTop: 4, lineHeight: 1.5 },

  assinaturaBox: { marginTop: 44, alignItems: "center" },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#737373", width: "60%", marginBottom: 6 },
  assinaturaLabel: { fontSize: 9, fontWeight: 700, color: CORES.grenaEscuro, textAlign: "center" },
  assinaturaExtra: { fontSize: 8, color: "#525252", textAlign: "center", marginTop: 2 },
});

export interface VeiculoLiberacaoPdf {
  nome: string;
  documento: string | null;
  placa: string;
  veiculo: string;
  telefone: string | null;
}

export interface VeiculosLiberacaoDados {
  evento: string | null;
  data: string | null;
  horario: string | null;
  local: string | null;
  observacoes: string | null;
  responsavelNome: string | null;
  responsavelFuncao: string | null;
}

/** Bloco de dados do jogo — só as linhas preenchidas. Vazio quando o documento não foi atrelado a
 * nada, e aí o componente não desenha a seção inteira. */
function linhasDoEvento(dados: VeiculosLiberacaoDados): { label: string; valor: string }[] {
  const linhas: { label: string; valor: string }[] = [];
  if (dados.evento) linhas.push({ label: "Jogo", valor: dados.evento });
  if (dados.data) linhas.push({ label: "Data", valor: formatDataBr(dados.data) });
  if (dados.horario) linhas.push({ label: "Horário", valor: dados.horario });
  if (dados.local) linhas.push({ label: "Local", valor: dados.local });
  return linhas;
}

export function VeiculosLiberacaoDocument({
  juventusLogoSrc,
  dados,
  veiculos,
  emitidoEm,
}: {
  juventusLogoSrc: LogoSrc;
  dados: VeiculosLiberacaoDados;
  veiculos: VeiculoLiberacaoPdf[];
  /** Data de emissão no formato ISO (yyyy-mm-dd) — vem de fora pro documento ser determinístico. */
  emitidoEm: string;
}) {
  const evento = linhasDoEvento(dados);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.logoBox}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
        </View>
        <View style={styles.tituloBar}>
          <Text style={styles.tituloTexto}>Relação de Placas</Text>
          <Text style={styles.subtituloTexto}>Emitido em {formatDataBr(emitidoEm)}</Text>
        </View>

        {evento.length > 0 ? (
          <>
            <View style={styles.sectionBar}>
              <Text style={styles.sectionBarTexto}>Jogo</Text>
            </View>
            <View>
              {evento.map((linha) => (
                <View style={styles.infoRow} key={linha.label}>
                  <View style={styles.infoLabelCell}>
                    <Text style={styles.infoLabelTexto}>{linha.label}</Text>
                  </View>
                  <View style={styles.infoValorCell}>
                    <Text style={styles.infoValorTexto}>{linha.valor}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>Veículos e condutores</Text>
        </View>
        <View style={styles.tabelaHeader}>
          <Text style={[styles.colNum, styles.headerCell]}>#</Text>
          <Text style={[styles.colCondutor, styles.headerCell]}>Condutor</Text>
          <Text style={[styles.colDocumento, styles.headerCell]}>RG / CPF</Text>
          <Text style={[styles.colPlaca, styles.headerCell]}>Placa</Text>
          <Text style={[styles.colVeiculo, styles.headerCell]}>Veículo</Text>
        </View>
        {veiculos.map((v, i) => (
          <View style={styles.tabelaLinha} key={i} wrap={false}>
            <Text style={[styles.colNum, styles.cell]}>{i + 1}</Text>
            <Text style={[styles.colCondutor, styles.cell]}>{v.nome}</Text>
            <Text style={[styles.colDocumento, v.documento ? styles.cell : styles.cellMuted]}>
              {v.documento ?? "—"}
            </Text>
            <Text style={[styles.colPlaca, styles.placaCell]}>{v.placa}</Text>
            <Text style={[styles.colVeiculo, styles.cell]}>{v.veiculo}</Text>
          </View>
        ))}

        {dados.observacoes ? (
          <>
            <View style={styles.sectionBar}>
              <Text style={styles.sectionBarTexto}>Observações</Text>
            </View>
            <Text style={styles.observacoesTexto}>{dados.observacoes}</Text>
          </>
        ) : null}

        <View style={styles.assinaturaBox} wrap={false}>
          <View style={styles.assinaturaLinha} />
          <Text style={styles.assinaturaLabel}>{dados.responsavelNome || "Responsável pela delegação"}</Text>
          <Text style={styles.assinaturaExtra}>{dados.responsavelFuncao || "Clube Atlético Juventus"}</Text>
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
