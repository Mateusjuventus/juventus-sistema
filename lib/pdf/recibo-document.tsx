import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow, StaffChavePixTipo } from "@/lib/supabase/types";
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

const CHAVE_PIX_TIPO_LABEL: Record<StaffChavePixTipo, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "e-mail",
  telefone: "telefone",
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
  // Colunas do Recibo Consolidado (página em paisagem — ver `ReciboConsolidadoDocument` abaixo).
  // A função não tem coluna própria aqui: os itens já vêm agrupados por função, com o nome dela no
  // cabeçalho da seção (`sharedStyles.sectionTitulo`), então repetir numa coluna seria redundante.
  colConsNome: { flex: 1.5 },
  colConsCpf: { width: 90 },
  colConsChavePix: { flex: 1.6 },
  colConsValor: { width: 75, textAlign: "right" },
  colConsPago: { width: 50, textAlign: "center" },
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

/** Junta tipo + valor da chave Pix numa única célula (ex.: "CPF · 123.456.789-00") — mesmo rótulo
 * de tipo já usado no Recibo Individual (`CHAVE_PIX_TIPO_LABEL`). */
function formatChavePixConsolidado(item: ReciboPdfItem): string {
  if (!item.chavePix) return "—";
  const tipoLabel = item.chavePixTipo ? CHAVE_PIX_TIPO_LABEL[item.chavePixTipo] : null;
  return tipoLabel ? `${tipoLabel} · ${item.chavePix}` : item.chavePix;
}

/**
 * Agrupa os itens do Recibo Consolidado pela função no jogo — pessoas da mesma função ficam juntas
 * na tabela, em vez de intercaladas na ordem em que foram marcadas como incluídas (ex.: todos os
 * Gandulas seguidos, depois todos os Seguranças). Grupos em ordem alfabética do nome da função, pra
 * o resultado ser sempre previsível independente da ordem de cadastro.
 */
function agruparPorFuncao(itens: ReciboPdfItem[]): { funcao: string; itens: ReciboPdfItem[] }[] {
  const grupos = new Map<string, ReciboPdfItem[]>();
  for (const item of itens) {
    const chave = item.funcaoJogo?.trim() || "Sem função";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(item);
  }
  return Array.from(grupos.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([funcao, itensDoGrupo]) => ({ funcao, itens: itensDoGrupo }));
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
  chavePixTipo?: StaffChavePixTipo | null;
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

/**
 * Consolidado de todos os pagamentos de um jogo — uma linha por pessoa, agrupadas por função (ver
 * `agruparPorFuncao`), com CPF e Chave Pix (+ tipo) de cada uma pra conferência antes do pagamento.
 * Página em paisagem (só este documento — o Recibo Individual continua em pé) porque as duas
 * colunas novas não cabiam de forma legível no retrato de A4.
 */
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
  const grupos = agruparPorFuncao(itens);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Recibo Consolidado de Pagamento"
        />

        {itens.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum recibo registrado.</Text>
        ) : (
          <View style={styles.table}>
            {grupos.map((grupo) => (
              <View key={grupo.funcao} wrap={false}>
                <Text style={sharedStyles.sectionTitulo}>{grupo.funcao}</Text>
                <View style={sharedStyles.tableHeaderRow}>
                  <Text style={[styles.colConsNome, sharedStyles.headerCell]}>Nome</Text>
                  <Text style={[styles.colConsCpf, sharedStyles.headerCell]}>CPF</Text>
                  <Text style={[styles.colConsChavePix, sharedStyles.headerCell]}>Chave Pix</Text>
                  <Text style={[styles.colConsValor, sharedStyles.headerCell]}>Valor</Text>
                  <Text style={[styles.colConsPago, sharedStyles.headerCell]}>Pago</Text>
                </View>
                {grupo.itens.map((item, i) => (
                  <View style={sharedStyles.tableRow} key={i} wrap={false}>
                    <Text style={styles.colConsNome}>{item.nome}</Text>
                    <Text style={styles.colConsCpf}>{item.cpf ? formatCPF(item.cpf) : "—"}</Text>
                    <Text style={styles.colConsChavePix}>{formatChavePixConsolidado(item)}</Text>
                    <Text style={styles.colConsValor}>{formatMoeda(item.valor)}</Text>
                    <Text style={styles.colConsPago}>{item.pago ? "Sim" : "—"}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValor}>{formatMoeda(total)}</Text>
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
