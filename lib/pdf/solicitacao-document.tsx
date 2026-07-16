import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import type { SolicitacaoTipo } from "@/lib/supabase/types";

const TITULOS: Record<SolicitacaoTipo, string> = {
  compra: "Solicitação de Compra",
  pagamento: "Solicitação de Pagamento",
  exame_medico: "Solicitação de Exame Médico",
  reembolso: "Solicitação de Reembolso",
  passagem_aerea: "Solicitação de Passagem Aérea",
};

const DEPARTAMENTOS: Record<SolicitacaoTipo, string> = {
  compra: "Departamento de Compras",
  pagamento: "Departamento Financeiro",
  exame_medico: "Departamento Médico",
  reembolso: "Departamento Financeiro",
  passagem_aerea: "Departamento de Viagens",
};

/** Tipos de solicitação que têm uma tabela de itens no PDF (Exame Médico não tem). */
const TIPOS_COM_ITENS: SolicitacaoTipo[] = ["compra", "pagamento", "reembolso", "passagem_aerea"];

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
  infoLabelCell: {
    width: 150,
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#a3a3a3",
  },
  infoLabelTexto: { fontSize: 8.5, fontWeight: 700, color: CORES.grena },
  infoValorCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, justifyContent: "center" },
  infoValorTexto: { fontSize: 9, color: "#171717" },
  itensBar: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 10,
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
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  itensRowBase: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingHorizontal: 8,
  },
  // Linha com foto precisa de altura extra pra caber a miniatura; sem foto, a linha fica do
  // tamanho natural do texto (senão parecia "inchada" à toa quando nenhum item tinha foto).
  itensRowComFoto: { paddingVertical: 6, minHeight: 44 },
  itensRowSemFoto: { paddingVertical: 6 },
  celulaCentro: { textAlign: "center" },
  // Colunas da tabela de itens de Compra — Observação é sempre a última coluna (flex), as demais
  // têm largura fixa, pra texto longo quebrar linha dentro da própria coluna em vez de invadir a
  // coluna seguinte.
  colFoto: { width: 50, alignItems: "center" },
  colItem: { width: 150, textAlign: "center" },
  colQuantidade: { width: 80, textAlign: "center" },
  colObservacaoCompra: { flex: 1, textAlign: "center" },
  fotoItem: { width: 36, height: 36, objectFit: "cover", borderRadius: 2 },
  // Colunas da tabela de itens de Pagamento/Reembolso — Observação por último (flex), pelo mesmo
  // motivo acima.
  colDescricao: { width: 190, textAlign: "center" },
  colValor: { width: 80, textAlign: "center" },
  colObservacaoValor: { flex: 1, textAlign: "center" },
  // Colunas da tabela de passageiros (Passagem Aérea) — Origem/Destino em colunas separadas (em vez
  // de "Origem → Destino" numa só) porque a fonte padrão do PDF não tem o caractere "→".
  colPassageiro: { width: 95, textAlign: "center" },
  colOrigem: { width: 90, textAlign: "center" },
  colDestino: { width: 90, textAlign: "center" },
  colDataVoo: { width: 95, textAlign: "center" },
  colObservacaoVoo: { flex: 1, textAlign: "center" },
  fecho: { height: 8, backgroundColor: CORES.grena, marginTop: 10 },
  assinaturasGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 56 },
  assinaturaCol: { width: "46%", alignItems: "center", marginBottom: 48 },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#737373", width: "100%", marginBottom: 6 },
  assinaturaLabel: { fontSize: 8.5, color: "#525252", textAlign: "center" },
  notaRodape: { fontSize: 7.5, color: "#737373", marginTop: 4, lineHeight: 1.4 },
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
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Documento de Solicitação (Compra, Pagamento, Exame Médico, Reembolso ou Passagem Aérea) — segue
 * o modelo de formulário impresso já usado pelo clube: logo centralizado no topo, faixa com o
 * título, tabela de dados (rótulo em vinho, valor em preto), tabela de itens centralizada (Exame
 * Médico não tem), e bloco de 4 assinaturas em branco pra imprimir e assinar.
 */
export function SolicitacaoDocument({
  juventusLogoSrc,
  solicitacao,
  itens,
}: {
  juventusLogoSrc: LogoSrc;
  solicitacao: SolicitacaoPdfData;
  itens: SolicitacaoPdfItem[];
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
  if (solicitacao.tipo === "reembolso") {
    linhas.push({
      label: "Chave PIX",
      value: `${solicitacao.chavePix ?? ""}${solicitacao.chavePixTipoLabel ? ` (${solicitacao.chavePixTipoLabel})` : ""}`,
    });
  }
  if (solicitacao.descricaoNecessidade) {
    linhas.push({
      label: solicitacao.tipo === "passagem_aerea" ? "Observações" : "Descrição da Necessidade",
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
                {solicitacao.tipo === "passagem_aerea" ? "Passageiros:" : "Itens Solicitados:"}
              </Text>
            </View>
            <View style={styles.itensTable}>
              {solicitacao.tipo === "compra" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colFoto, sharedStyles.headerCell, styles.celulaCentro]}>Foto</Text>
                    <Text style={[styles.colItem, sharedStyles.headerCell]}>Item</Text>
                    <Text style={[styles.colQuantidade, sharedStyles.headerCell]}>Quantidade</Text>
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
                        <View style={styles.colFoto}>
                          {item.fotoSrc ? (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <Image style={styles.fotoItem} src={item.fotoSrc as string} />
                          ) : null}
                        </View>
                        <Text style={styles.colItem}>{item.item}</Text>
                        <Text style={styles.colQuantidade}>{item.quantidade}</Text>
                        <Text style={styles.colObservacaoCompra}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : solicitacao.tipo === "passagem_aerea" ? (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colPassageiro, sharedStyles.headerCell]}>Passageiro</Text>
                    <Text style={[styles.colOrigem, sharedStyles.headerCell]}>Origem</Text>
                    <Text style={[styles.colDestino, sharedStyles.headerCell]}>Destino</Text>
                    <Text style={[styles.colDataVoo, sharedStyles.headerCell]}>Data / Horário</Text>
                    <Text style={[styles.colObservacaoVoo, sharedStyles.headerCell]}>Observações</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum passageiro adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={styles.colPassageiro}>{item.passageiro}</Text>
                        <Text style={styles.colOrigem}>{item.origem}</Text>
                        <Text style={styles.colDestino}>{item.destino}</Text>
                        <Text style={styles.colDataVoo}>
                          {formatDataBr(item.dataVoo)}
                          {item.horarioVoo ? ` às ${item.horarioVoo.slice(0, 5)}` : ""}
                        </Text>
                        <Text style={styles.colObservacaoVoo}>{item.observacao || "—"}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <>
                  <View style={styles.itensHeaderRow}>
                    <Text style={[styles.colDescricao, sharedStyles.headerCell]}>Descrição</Text>
                    <Text style={[styles.colValor, sharedStyles.headerCell]}>Valor</Text>
                    <Text style={[styles.colObservacaoValor, sharedStyles.headerCell]}>Observação</Text>
                  </View>
                  {itens.length === 0 ? (
                    <Text style={sharedStyles.emptyState}>Nenhum item adicionado ainda.</Text>
                  ) : (
                    itens.map((item, i) => (
                      <View style={[styles.itensRowBase, styles.itensRowSemFoto]} key={i} wrap={false}>
                        <Text style={styles.colDescricao}>{item.descricao}</Text>
                        <Text style={styles.colValor}>{item.valor !== null ? formatMoeda(item.valor) : "—"}</Text>
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

        <View style={styles.assinaturasGrid} wrap={false}>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Solicitante</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Encarregado Departamento</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>{departamento}</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Aprovador</Text>
          </View>
        </View>

        <Text style={styles.notaRodape}>
          Todas as solicitações devem ser enviadas com uma semana de antecedência para o {departamento.toLowerCase()}.
        </Text>
        <Text style={styles.notaRodape}>
          Solicitações sem assinatura do gestor da área não serão processadas.
        </Text>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
