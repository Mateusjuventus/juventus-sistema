import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  AssinaturasBlock,
  CORES,
  DocumentoFooter,
  formatDataBr,
  sharedStyles,
  type AssinaturaInfo,
  type LogoSrc,
} from "./logistica-shared";
import type { SolicitacaoTipo } from "@/lib/supabase/types";

const TITULOS: Record<SolicitacaoTipo, string> = {
  compra: "Solicitação de Compra",
  pagamento: "Solicitação de Pagamento",
  exame_medico: "Solicitação de Exame Médico",
  reembolso: "Solicitação de Reembolso",
  passagem_aerea: "Solicitação de Passagem Aérea",
  transporte: "Solicitação de Transporte",
  hospedagem: "Solicitação de Hospedagem",
};

const DEPARTAMENTOS: Record<SolicitacaoTipo, string> = {
  compra: "Departamento de Compras",
  pagamento: "Departamento Financeiro",
  exame_medico: "Departamento Médico",
  reembolso: "Departamento Financeiro",
  passagem_aerea: "Departamento de Viagens",
  transporte: "Departamento de Viagens",
  hospedagem: "Departamento de Viagens",
};

/** Tipos de solicitação que têm uma tabela de itens no PDF. */
const TIPOS_COM_ITENS: SolicitacaoTipo[] = [
  "compra",
  "pagamento",
  "reembolso",
  "passagem_aerea",
  "exame_medico",
  "transporte",
  "hospedagem",
];

const styles = StyleSheet.create({
  logoBox: {
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  logo: { width: 46, height: 46, objectFit: "contain" },
  tituloBar: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: CORES.grena,
    paddingVertical: 6,
  },
  tituloTexto: {
    fontSize: 12,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoTable: { borderWidth: 1, borderTopWidth: 0, borderColor: "#262626" },
  infoRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#a3a3a3" },
  infoRowUltima: { flexDirection: "row" },
  // Padding/fonte reduzidos (eram paddingVertical: 6 / fontSize 8.5-9) pra essa tabela de cima
  // (Data, Solicitante, Setor etc.) ficar com a mesma altura de linha compacta da tabela de itens
  // logo abaixo — antes ficava bem mais "alta" que a tabela de itens, o que destoava.
  infoLabelCell: {
    width: 150,
    backgroundColor: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#a3a3a3",
  },
  infoLabelTexto: { fontSize: 8, fontWeight: 700, color: CORES.grena },
  infoValorCell: { flex: 1, paddingVertical: 4, paddingHorizontal: 8, justifyContent: "center" },
  infoValorTexto: { fontSize: 8.5, color: "#171717" },
  itensBar: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: CORES.grena,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  itensBarTexto: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    textAlign: "center",
  },
  itensTable: { borderWidth: 1, borderTopWidth: 0, borderColor: "#262626" },
  itensHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a3a3a3",
    paddingVertical: 3,
  },
  itensRowBase: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  // Linha com foto precisa de altura extra pra caber a miniatura; sem foto, a linha fica do
  // tamanho natural do texto (senão parecia "inchada" à toa quando nenhum item tinha foto) — mas
  // ambas ficam bem mais compactas que antes, pra caber mais itens por página.
  itensRowComFoto: { paddingVertical: 3, minHeight: 34 },
  itensRowSemFoto: { paddingVertical: 3 },
  celulaCentro: { textAlign: "center" },
  // Toda coluna (exceto a última de cada tabela, que é sempre flex) tem uma borda à direita —
  // separa visualmente as colunas em "quadros" bem demarcados, e padding pra não colar o texto na
  // linha divisória. Fonte um pouco menor (8) pra cada linha ficar mais compacta.
  colDivisor: { borderRightWidth: 0.5, borderRightColor: "#d4d4d4" },
  // Colunas da tabela de itens de Compra — Observação é sempre a última coluna (flex), as demais
  // têm largura fixa, pra texto longo quebrar linha dentro da própria coluna em vez de invadir a
  // coluna seguinte.
  colFoto: { width: 46, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  colItem: { width: 140, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colQuantidade: { width: 70, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colObservacaoCompra: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  // objectFit "contain" (não "cover") pra foto aparecer inteira dentro do quadro, sem cortar
  // nenhuma borda — se a foto não for quadrada, sobra um espacinho em branco de um dos lados em
  // vez de cortar parte da imagem.
  fotoItem: { width: 28, height: 28, objectFit: "contain", borderRadius: 2 },
  // Colunas da tabela de itens de Pagamento/Reembolso — Observação por último (flex), pelo mesmo
  // motivo acima.
  colDescricao: { width: 180, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colValor: { width: 75, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colObservacaoValor: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  // Colunas da tabela de passageiros (Passagem Aérea) — Origem/Destino em colunas separadas (em vez
  // de "Origem → Destino" numa só) porque a fonte padrão do PDF não tem o caractere "→".
  colPassageiro: { width: 90, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colOrigem: { width: 85, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colDestino: { width: 85, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colDataVoo: { width: 90, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colObservacaoVoo: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  // Colunas da tabela de Transporte — mesmo layout de Passagem Aérea, mas com uma coluna extra de
  // Valor antes da Observação (que continua sendo a última, flex).
  colObservacaoTransporte: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  // Colunas da tabela de Hospedagem.
  colHospPassageiro: { width: 80, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colHospCidade: { width: 70, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colHospHotel: { width: 80, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colHospDatas: { width: 85, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colHospAcomodacao: { width: 75, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colHospObservacao: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  // Colunas da tabela de Exame Médico — Transporte resume ida/volta em duas linhas dentro da mesma
  // célula (ou "Não houve transporte"), Observação por último (flex).
  colExameNome: { width: 65, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colExameExame: { width: 95, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colExameData: { width: 50, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colExameLocal: { width: 75, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colExameTransporte: { width: 140, textAlign: "center", fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 4 },
  colExameObservacao: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  fecho: { height: 8, backgroundColor: CORES.grena, marginTop: 8 },
  // marginTop/marginBottom reduzidos (eram 56/48) pra sobrar espaço suficiente pro bloco de
  // assinaturas continuar cabendo na mesma página mesmo quando a lista de itens é longa — sem
  // isso, qualquer solicitação com muitos itens empurrava as assinaturas sozinhas pra uma segunda
  // folha em branco. Ainda assim, um pouco mais folgados que o mínimo (36/34) pra dar mais espaço
  // real pra assinar por cima da linha.
  notaRodape: { fontSize: 7.5, color: "#737373", marginTop: 3, lineHeight: 1.3 },
});

/**
 * Item de uma solicitação, no formato usado pra montar o PDF. Os campos usados dependem do tipo da
 * solicitação (ver comentário em SolicitacaoItemRow, em lib/supabase/types.ts) — o componente
 * escolhe quais colunas mostrar conforme `solicitacao.tipo`.
 */
export interface SolicitacaoPdfItem {
  quantidade: string | null;
  item: string | null;
  fotoSrc: LogoSrc;
  descricao: string | null;
  observacao: string | null;
  valor: number | null;
  passageiro: string | null;
  origem: string | null;
  destino: string | null;
  dataVoo: string | null;
  horarioVoo: string | null;
  cidade: string | null;
  hotel: string | null;
  dataEntrada: string | null;
  dataSaida: string | null;
  tipoAcomodacao: string | null;
  // Exclusivos de Exame Médico — origem/destino/dataVoo/horarioVoo (acima) são reaproveitados pro
  // trecho de IDA do transporte.
  dataExame: string | null;
  localExame: string | null;
  houveTransporte: boolean;
  origemVolta: string | null;
  destinoVolta: string | null;
  dataVolta: string | null;
  horarioVolta: string | null;
}

export interface SolicitacaoPdfData {
  tipo: SolicitacaoTipo;
  dataSolicitacao: string;
  solicitante: string;
  setor: string;
  descricaoNecessidade: string | null;
  prazoSugerido: string | null;
  valor: number | null;
  chavePix: string | null;
  chavePixTipoLabel: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoContaLabel: string | null;
  titularConta: string | null;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Estado das 2 assinaturas da Solicitação (ver docs/superpowers/specs/2026-08-28-assinatura-
 * digital-notificacoes-design.md) — `null` = ainda pendente. */
export interface SolicitacaoAssinaturas {
  solicitante: { nome: string; cargo: string | null; assinadoEm: string } | null;
  encarregado: { nome: string; cargo: string | null; assinadoEm: string } | null;
}

/** Combina o que foi salvo em `assinaturas_documento` com o estado esperado (Solicitante +
 * Encarregado) — mesmo espírito de `montarAssinaturasDispensa` em
 * `lib/pdf/relatorio-dispensa-document.tsx`. */
export function montarAssinaturasSolicitacao(
  assinaturasSalvas: { papel: string; nomeNoMomento: string; cargoNoMomento: string | null; assinadoEm: string }[],
): SolicitacaoAssinaturas {
  function porPapel(papel: string) {
    const a = assinaturasSalvas.find((x) => x.papel === papel);
    return a ? { nome: a.nomeNoMomento, cargo: a.cargoNoMomento, assinadoEm: a.assinadoEm } : null;
  }
  return { solicitante: porPapel("solicitante"), encarregado: porPapel("encarregado") };
}

/**
 * Documento de Solicitação (Compra, Pagamento, Exame Médico, Reembolso ou Passagem Aérea) — segue
 * o modelo de formulário impresso já usado pelo clube: logo centralizado no topo, faixa com o
 * título, tabela de dados (rótulo em vinho, valor em preto), tabela de itens centralizada, e bloco
 * de assinaturas (Solicitante + Encarregado do Departamento — antes eram 4 linhas em branco,
 * incluindo um "Aprovador" que o Mateus decidiu não precisar mais, ver a spec).
 */
export function SolicitacaoDocument({
  juventusLogoSrc,
  solicitacao,
  itens,
  assinaturas,
}: {
  juventusLogoSrc: LogoSrc;
  solicitacao: SolicitacaoPdfData;
  itens: SolicitacaoPdfItem[];
  assinaturas: SolicitacaoAssinaturas;
}) {
  const departamento = DEPARTAMENTOS[solicitacao.tipo];
  const mostrarItens = TIPOS_COM_ITENS.includes(solicitacao.tipo);

  // Monta as linhas da tabela de dados dinamicamente, conforme o tipo — assim a última linha (que
  // não deve ter borda inferior, já que a tabela toda já tem uma borda ao redor) é sempre a linha
  // certa, sem precisar decidir isso "na mão" em cada combinação possível de tipo.
  const linhas: { label: string; value: string }[] = [
    { label: "Data", value: formatDataBr(solicitacao.dataSolicitacao) },
    { label: "Solicitante", value: solicitacao.solicitante },
    { label: "Setor / C.C", value: solicitacao.setor },
  ];
  if (solicitacao.prazoSugerido) {
    linhas.push({ label: "Prazo Sugerido", value: formatDataBr(solicitacao.prazoSugerido) });
  }
  if (solicitacao.valor !== null) {
    linhas.push({
      label: solicitacao.tipo === "reembolso" ? "Valor Total a Reembolsar" : "Valor Total a Pagar",
      value: formatMoeda(solicitacao.valor),
    });
  }
  const mostrarDadosPagamento = solicitacao.tipo === "reembolso" || solicitacao.tipo === "pagamento";
  if (mostrarDadosPagamento && solicitacao.chavePix) {
    linhas.push({
      label: "Chave PIX",
      value: `${solicitacao.chavePix}${solicitacao.chavePixTipoLabel ? ` (${solicitacao.chavePixTipoLabel})` : ""}`,
    });
  }
  if (mostrarDadosPagamento && (solicitacao.banco || solicitacao.agencia || solicitacao.conta)) {
    const partes = [
      solicitacao.banco,
      solicitacao.agencia ? `Ag. ${solicitacao.agencia}` : null,
      solicitacao.conta ? `Conta ${solicitacao.conta}${solicitacao.tipoContaLabel ? ` (${solicitacao.tipoContaLabel})` : ""}` : null,
      solicitacao.titularConta ? `Titular: ${solicitacao.titularConta}` : null,
    ].filter(Boolean);
    linhas.push({ label: "Dados Bancários", value: partes.join(" · ") });
  }
  if (solicitacao.descricaoNecessidade) {
    linhas.push({
      label: ["passagem_aerea", "transporte", "hospedagem"].includes(solicitacao.tipo)
        ? "Observações"
        : "Descrição da Necessidade",
      value: solicitacao.descricaoNecessidade,
    });
  }

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
          <Text style={styles.tituloTexto}>{TITULOS[solicitacao.tipo]}</Text>
        </View>

        <View style={styles.infoTable}>
          {linhas.map((linha, i) => (
            <View style={i === linhas.length - 1 ? styles.infoRowUltima : styles.infoRow} key={linha.label}>
              <View style={styles.infoLabelCell}>
                <Text style={styles.infoLabelTexto}>{linha.label}</Text>
              </View>
              <View style={styles.infoValorCell}>
                <Text style={styles.infoValorTexto}>{linha.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {mostrarItens ? (
          <>
            <View style={styles.itensBar}>
              <Text style={styles.itensBarTexto}>
                {solicitacao.tipo === "passagem_aerea" || solicitacao.tipo === "transporte"
                  ? "Passageiros:"
                  : solicitacao.tipo === "hospedagem"
                    ? "Hóspedes:"
                    : solicitacao.tipo === "exame_medico"
                      ? "Exames:"
                      : "Itens Solicitados:"}
              </Text>
            </View>
            <View style={styles.itensTable}>
              {solicitacao.tipo === "compra" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colFoto, styles.colDivisor, sharedStyles.headerCell, styles.celulaCentro]}>
                      Foto
                    </Text>
                    <Text style={[styles.colItem, styles.colDivisor, sharedStyles.headerCell]}>Item</Text>
                    <Text style={[styles.colQuantidade, styles.colDivisor, sharedStyles.headerCell]}>
                      Quantidade
                    </Text>
                    <Text style={[styles.colObservacaoCompra, sharedStyles.headerCell]}>Observação</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum item adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View
                        style={[styles.itensRowBase, item.fotoSrc ? styles.itensRowComFoto : styles.itensRowSemFoto]}
                        key={i}
                        wrap={false}
                      >
                        <View style={[styles.colFoto, styles.colDivisor]}>
                          {item.fotoSrc ? (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <Image style={styles.fotoItem} src={item.fotoSrc as string} />
                          ) : null}
                        </View>
                        <Text style={[styles.colItem, styles.colDivisor]}>{item.item}</Text>
                        <Text style={[styles.colQuantidade, styles.colDivisor]}>{item.quantidade}</Text>
                        <Text style={styles.colObservacaoCompra}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : solicitacao.tipo === "passagem_aerea" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colPassageiro, styles.colDivisor, sharedStyles.headerCell]}>
                      Passageiro
                    </Text>
                    <Text style={[styles.colOrigem, styles.colDivisor, sharedStyles.headerCell]}>Origem</Text>
                    <Text style={[styles.colDestino, styles.colDivisor, sharedStyles.headerCell]}>Destino</Text>
                    <Text style={[styles.colDataVoo, styles.colDivisor, sharedStyles.headerCell]}>
                      Data / Horário
                    </Text>
                    <Text style={[styles.colObservacaoVoo, sharedStyles.headerCell]}>Observações</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum passageiro adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={[styles.colPassageiro, styles.colDivisor]}>{item.passageiro}</Text>
                        <Text style={[styles.colOrigem, styles.colDivisor]}>{item.origem}</Text>
                        <Text style={[styles.colDestino, styles.colDivisor]}>{item.destino}</Text>
                        <Text style={[styles.colDataVoo, styles.colDivisor]}>
                          {formatDataBr(item.dataVoo)}
                          {item.horarioVoo ? ` às ${item.horarioVoo.slice(0, 5)}` : ""}
                        </Text>
                        <Text style={styles.colObservacaoVoo}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : solicitacao.tipo === "transporte" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colPassageiro, styles.colDivisor, sharedStyles.headerCell]}>
                      Passageiro
                    </Text>
                    <Text style={[styles.colOrigem, styles.colDivisor, sharedStyles.headerCell]}>Origem</Text>
                    <Text style={[styles.colDestino, styles.colDivisor, sharedStyles.headerCell]}>Destino</Text>
                    <Text style={[styles.colDataVoo, styles.colDivisor, sharedStyles.headerCell]}>
                      Data / Horário
                    </Text>
                    <Text style={[styles.colValor, styles.colDivisor, sharedStyles.headerCell]}>Valor</Text>
                    <Text style={[styles.colObservacaoTransporte, sharedStyles.headerCell]}>Observações</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum passageiro adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={[styles.colPassageiro, styles.colDivisor]}>{item.passageiro}</Text>
                        <Text style={[styles.colOrigem, styles.colDivisor]}>{item.origem}</Text>
                        <Text style={[styles.colDestino, styles.colDivisor]}>{item.destino}</Text>
                        <Text style={[styles.colDataVoo, styles.colDivisor]}>
                          {formatDataBr(item.dataVoo)}
                          {item.horarioVoo ? ` às ${item.horarioVoo.slice(0, 5)}` : ""}
                        </Text>
                        <Text style={[styles.colValor, styles.colDivisor]}>
                          {item.valor !== null ? formatMoeda(item.valor) : "—"}
                        </Text>
                        <Text style={styles.colObservacaoTransporte}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : solicitacao.tipo === "hospedagem" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colHospPassageiro, styles.colDivisor, sharedStyles.headerCell]}>
                      Passageiro
                    </Text>
                    <Text style={[styles.colHospCidade, styles.colDivisor, sharedStyles.headerCell]}>Cidade</Text>
                    <Text style={[styles.colHospHotel, styles.colDivisor, sharedStyles.headerCell]}>Hotel</Text>
                    <Text style={[styles.colHospDatas, styles.colDivisor, sharedStyles.headerCell]}>
                      Entrada / Saída
                    </Text>
                    <Text style={[styles.colHospAcomodacao, styles.colDivisor, sharedStyles.headerCell]}>
                      Acomodação
                    </Text>
                    <Text style={[styles.colValor, styles.colDivisor, sharedStyles.headerCell]}>Valor</Text>
                    <Text style={[styles.colHospObservacao, sharedStyles.headerCell]}>Observação</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum hóspede adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={[styles.colHospPassageiro, styles.colDivisor]}>{item.passageiro}</Text>
                        <Text style={[styles.colHospCidade, styles.colDivisor]}>{item.cidade || "—"}</Text>
                        <Text style={[styles.colHospHotel, styles.colDivisor]}>{item.hotel || "—"}</Text>
                        <Text style={[styles.colHospDatas, styles.colDivisor]}>
                          {formatDataBr(item.dataEntrada)} → {formatDataBr(item.dataSaida)}
                        </Text>
                        <Text style={[styles.colHospAcomodacao, styles.colDivisor]}>
                          {item.tipoAcomodacao || "—"}
                        </Text>
                        <Text style={[styles.colValor, styles.colDivisor]}>
                          {item.valor !== null ? formatMoeda(item.valor) : "—"}
                        </Text>
                        <Text style={styles.colHospObservacao}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : solicitacao.tipo === "exame_medico" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colExameNome, styles.colDivisor, sharedStyles.headerCell]}>Nome</Text>
                    <Text style={[styles.colExameExame, styles.colDivisor, sharedStyles.headerCell]}>Exame</Text>
                    <Text style={[styles.colExameData, styles.colDivisor, sharedStyles.headerCell]}>Data</Text>
                    <Text style={[styles.colExameLocal, styles.colDivisor, sharedStyles.headerCell]}>Local</Text>
                    <Text style={[styles.colExameTransporte, styles.colDivisor, sharedStyles.headerCell]}>
                      Transporte
                    </Text>
                    <Text style={[styles.colExameObservacao, sharedStyles.headerCell]}>Observação</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum exame adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={[styles.colExameNome, styles.colDivisor]}>{item.passageiro}</Text>
                        <Text style={[styles.colExameExame, styles.colDivisor]}>{item.item}</Text>
                        <Text style={[styles.colExameData, styles.colDivisor]}>{formatDataBr(item.dataExame)}</Text>
                        <Text style={[styles.colExameLocal, styles.colDivisor]}>{item.localExame || "—"}</Text>
                        <Text style={[styles.colExameTransporte, styles.colDivisor]}>
                          {item.houveTransporte
                            ? `Ida: ${item.origem || "—"} - ${item.destino || "—"}\n${formatDataBr(item.dataVoo)}${item.horarioVoo ? ` às ${item.horarioVoo.slice(0, 5)}` : ""}\nVolta: ${item.origemVolta || "—"} - ${item.destinoVolta || "—"}\n${formatDataBr(item.dataVolta)}${item.horarioVolta ? ` às ${item.horarioVolta.slice(0, 5)}` : ""}`
                            : "Não houve transporte"}
                        </Text>
                        <Text style={styles.colExameObservacao}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colDescricao, styles.colDivisor, sharedStyles.headerCell]}>Descrição</Text>
                    <Text style={[styles.colValor, styles.colDivisor, sharedStyles.headerCell]}>Valor</Text>
                    <Text style={[styles.colObservacaoValor, sharedStyles.headerCell]}>Observação</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum item adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={[styles.colDescricao, styles.colDivisor]}>{item.descricao}</Text>
                        <Text style={[styles.colValor, styles.colDivisor]}>
                          {item.valor !== null ? formatMoeda(item.valor) : "—"}
                        </Text>
                        <Text style={styles.colObservacaoValor}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          </>
        ) : null}

        <View style={styles.fecho} />

        <AssinaturasBlock
          assinatura1={
            assinaturas.solicitante
              ? {
                  nome: assinaturas.solicitante.nome,
                  cargo: assinaturas.solicitante.cargo ?? "Solicitante",
                  assinadoDigitalmenteEm: assinaturas.solicitante.assinadoEm,
                }
              : { nome: "", cargo: "Solicitante", pendente: true }
          }
          assinatura2={
            assinaturas.encarregado
              ? {
                  nome: assinaturas.encarregado.nome,
                  cargo: assinaturas.encarregado.cargo ?? "Encarregado do Departamento",
                  assinadoDigitalmenteEm: assinaturas.encarregado.assinadoEm,
                }
              : { nome: "", cargo: "Encarregado do Departamento", pendente: true }
          }
        />

        <Text style={styles.notaRodape}>
          Todas as solicitações devem ser enviadas com uma semana de antecedência para o {departamento.toLowerCase()}.
        </Text>
        <Text style={styles.notaRodape}>
          Solicitações sem assinatura do Encarregado do Departamento não serão processadas.
        </Text>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
