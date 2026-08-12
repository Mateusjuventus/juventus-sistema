import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relação de Veículos — Solicitação de Liberação de Acesso.
 *
 * É o ofício que o clube manda antes de jogo fora ("segue a relação de placas das pessoas que vão
 * de carro") pra portaria/segurança do estádio liberar a entrada. Segue o mesmo desenho dos outros
 * documentos oficiais do sistema (escudo, faixa de título, corpo, tabela, assinatura) — ver
 * `lib/pdf/termo-retirada-document.tsx`.
 *
 * O texto do ofício é montado a partir do que foi preenchido na tela; parte que ficou em branco
 * simplesmente não entra na frase, pra nunca sair um "no dia __" pela metade.
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

  destinatario: { fontSize: 10, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 6 },
  corpo: { fontSize: 9.5, color: "#262626", lineHeight: 1.55, marginTop: 8, textAlign: "justify" },

  sectionBar: {
    backgroundColor: "#f5f5f5",
    borderLeftWidth: 3,
    borderLeftColor: CORES.dourado,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 14,
    marginBottom: 4,
  },
  sectionBarTexto: { fontSize: 8.5, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },

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
  destinatario: string | null;
  evento: string | null;
  data: string | null;
  horario: string | null;
  local: string | null;
  observacoes: string | null;
  responsavelNome: string | null;
  responsavelFuncao: string | null;
}

/** Frase do ofício montada só com o que existe — sem lacuna vazia no meio do texto. */
function montarCorpo(dados: VeiculosLiberacaoDados, quantidade: number): string {
  const veiculosTexto = quantidade === 1 ? "o veículo relacionado abaixo" : `os ${quantidade} veículos relacionados abaixo`;
  const partes: string[] = [
    `Vimos por meio deste solicitar a liberação de acesso para ${veiculosTexto}, pertencentes a integrantes da delegação do Clube Atlético Juventus`,
  ];

  if (dados.evento) partes.push(`, por ocasião de ${dados.evento}`);
  if (dados.data) {
    const dia = `no dia ${formatDataBr(dados.data)}`;
    partes.push(dados.horario ? `, ${dia}, às ${dados.horario}` : `, ${dia}`);
  } else if (dados.horario) {
    partes.push(`, às ${dados.horario}`);
  }
  if (dados.local) partes.push(`, em ${dados.local}`);
  partes.push(".");

  return partes.join("");
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
          <Text style={styles.tituloTexto}>Relação de Veículos — Liberação de Acesso</Text>
          <Text style={styles.subtituloTexto}>Emitido em {formatDataBr(emitidoEm)}</Text>
        </View>

        {dados.destinatario ? <Text style={styles.destinatario}>{dados.destinatario}</Text> : null}

        <Text style={styles.corpo}>{montarCorpo(dados, veiculos.length)}</Text>

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

        <Text style={styles.corpo}>
          Colocamo-nos à disposição para quaisquer esclarecimentos e agradecemos antecipadamente pela
          atenção dispensada.
        </Text>

        <View style={styles.assinaturaBox} wrap={false}>
          <View style={styles.assinaturaLinha} />
          <Text style={styles.assinaturaLabel}>{dados.responsavelNome || "Responsável pela delegação"}</Text>
          <Text style={styles.assinaturaExtra}>
            {dados.responsavelFuncao || "Clube Atlético Juventus"}
          </Text>
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
