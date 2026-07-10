import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ChavePixTipo, JogoRow } from "@/lib/supabase/types";
import { formatCPF } from "@/lib/validation/cpf";
import { valorPorExtenso } from "./valor-extenso";
import {
  CORES,
  DocumentoFooter,
  DocumentoHeader,
  formatDataBr,
  JUVENTUS_CNPJ,
  JUVENTUS_RAZAO_SOCIAL,
  sharedStyles,
  type LogoSrc,
} from "./logistica-shared";

/** Cidade onde o clube está sediado — usada na linha de local/data do recibo. */
const JUVENTUS_CIDADE_ASSINATURA = "São Paulo – SP";

const CHAVE_PIX_TIPO_LABEL: Record<ChavePixTipo, string> = {
  celular: "celular",
  email: "e-mail",
  cpf: "CPF",
  aleatoria: "aleatória",
};

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function formatDataPorExtenso(data: Date): string {
  return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
}

function formatValorNumero(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Monta o texto "de Competição - Rodada, entre Juventus e Adversário, realizado em data às horário" a partir do jogo cadastrado. */
function textoJogo(jogo: JogoRow): string {
  const ladoEsquerdo = jogo.mandante ? "Juventus" : jogo.adversario_nome;
  const ladoDireito = jogo.mandante ? jogo.adversario_nome : "Juventus";
  const competicaoTexto = `${jogo.competicao}${jogo.rodada_fase ? ` - ${jogo.rodada_fase}` : ""}`;
  const horarioTexto = jogo.horario ? `, às ${jogo.horario.slice(0, 5)}` : "";
  return `de ${competicaoTexto}, entre ${ladoEsquerdo} e ${ladoDireito}, realizado em ${formatDataBr(jogo.data_jogo)}${horarioTexto}`;
}

const styles = StyleSheet.create({
  headerLogo: { width: 84, height: 96, alignSelf: "center", objectFit: "contain" },
  tituloRecibo: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 10,
    marginBottom: 28,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  paragrafo: { fontSize: 11, color: "#1f1f1f", lineHeight: 1.7, textAlign: "justify" },
  negrito: { fontWeight: 700 },
  chavePixLinha: { fontSize: 10.5, color: "#1f1f1f", marginTop: 18 },
  localData: { fontSize: 10.5, color: "#1f1f1f", textAlign: "center", marginTop: 90 },
  assinaturaLinha: { fontSize: 10.5, color: "#1f1f1f", textAlign: "center", marginTop: 40 },
  table: { marginTop: 4 },
  colNome: { flex: 1.4 },
  colFuncao: { flex: 1 },
  colValor: { width: 80, textAlign: "right" },
  colPago: { width: 50, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#d4d4d4",
  },
  totalLabel: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro, marginRight: 8 },
  totalValor: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro },
});

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ReciboPdfItem {
  nome: string;
  tipo: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  funcaoJogo: string | null;
  valor: number | null;
  chavePix: string | null;
  chavePixTipo?: ChavePixTipo | null;
  pago: boolean;
}

/**
 * Recibo individual — um por pessoa, no texto corrido do modelo que o Mateus já usa em papel
 * (nome, nascimento, CPF/RG, valor em número e por extenso, função no jogo, dados da empresa, jogo,
 * chave PIX e linha de assinatura com local/data do dia em que o recibo foi gerado). Todo documento
 * oficial do sistema leva o rodapé com a identidade do clube — ver DocumentoFooter.
 */
export function ReciboIndividualDocument({
  jogo,
  juventusLogoSrc,
  itens,
  geradoEm,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  itens: ReciboPdfItem[];
  geradoEm: Date;
}) {
  return (
    <Document>
      {itens.map((item, i) => (
        <Page size="A4" style={sharedStyles.page} key={i}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
          ) : null}
          <Text style={styles.tituloRecibo}>Recibo</Text>

          <Text style={styles.paragrafo}>
            Eu, <Text style={styles.negrito}>{item.nome}</Text>, nascido(a) em{" "}
            <Text style={styles.negrito}>{formatDataBr(item.dataNascimento ?? null)}</Text>, portador(a) do CPF nº{" "}
            <Text style={styles.negrito}>{formatCPF(item.cpf ?? "")}</Text> e do RG nº {item.rg ?? "—"}, recebi da
            empresa <Text style={styles.negrito}>{JUVENTUS_RAZAO_SOCIAL}</Text>, inscrita no CNPJ nº{" "}
            {JUVENTUS_CNPJ}, a importância de{" "}
            <Text style={styles.negrito}>
              R$ {formatValorNumero(item.valor)} ({valorPorExtenso(item.valor ?? 0)})
            </Text>
            , referente à prestação de serviços como{" "}
            <Text style={styles.negrito}>{item.funcaoJogo ?? "—"}</Text> no jogo {textoJogo(jogo)}.
          </Text>

          <Text style={styles.chavePixLinha}>
            Chave Pix ({item.chavePixTipo ? CHAVE_PIX_TIPO_LABEL[item.chavePixTipo] : "—"}):{" "}
            {item.chavePix ?? "—"}
          </Text>

          <Text style={styles.localData}>
            {JUVENTUS_CIDADE_ASSINATURA}, {formatDataPorExtenso(geradoEm)}.
          </Text>

          <Text style={styles.assinaturaLinha}>Assinatura: ________________________________</Text>

          <DocumentoFooter />
        </Page>
      ))}
    </Document>
  );
}

export function ReciboConsolidadoDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  itens,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  itens: ReciboPdfItem[];
}) {
  const total = itens.reduce((soma, item) => soma + (item.valor ?? 0), 0);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Recibo Consolidado de Pagamento"
        />

        <View style={styles.table}>
          <View style={sharedStyles.tableHeaderRow}>
            <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
            <Text style={[styles.colFuncao, sharedStyles.headerCell]}>Função no jogo</Text>
            <Text style={[styles.colValor, sharedStyles.headerCell]}>Valor</Text>
            <Text style={[styles.colPago, sharedStyles.headerCell]}>Pago</Text>
          </View>
          {itens.length === 0 ? (
            <Text style={sharedStyles.emptyState}>Nenhum recibo registrado.</Text>
          ) : (
            itens.map((item, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colNome}>{item.nome}</Text>
                <Text style={styles.colFuncao}>{item.funcaoJogo ?? "—"}</Text>
                <Text style={styles.colValor}>{formatMoeda(item.valor)}</Text>
                <Text style={styles.colPago}>{item.pago ? "Sim" : "—"}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValor}>{formatMoeda(total)}</Text>
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
