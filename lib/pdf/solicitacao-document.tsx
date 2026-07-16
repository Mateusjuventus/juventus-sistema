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

const AZUL_VALOR = "#1d4ed8";

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
    backgroundColor: "#f7eef2",
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#a3a3a3",
  },
  infoLabelTexto: { fontSize: 8.5, fontWeight: 700, color: CORES.grena },
  infoValorCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, justifyContent: "center" },
  infoValorTexto: { fontSize: 9, color: AZUL_VALOR },
  itensBar: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  itensBarTexto: { fontSize: 9.5, fontWeight: 700, color: "#ffffff", textTransform: "uppercase" },
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
  colFoto: { width: 50 },
  colQuantidade: { width: 110 },
  colItem: { flex: 1 },
  fotoItem: { width: 36, height: 36, objectFit: "cover", borderRadius: 2 },
  fecho: { height: 8, backgroundColor: CORES.grena, marginTop: 10 },
  assinaturasGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 56 },
  assinaturaCol: { width: "46%", alignItems: "center", marginBottom: 48 },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#737373", width: "100%", marginBottom: 6 },
  assinaturaLabel: { fontSize: 8.5, color: "#525252", textAlign: "center" },
  notaRodape: { fontSize: 7.5, color: "#737373", marginTop: 4, lineHeight: 1.4 },
});

export interface SolicitacaoPdfItem {
  quantidade: string;
  item: string;
  fotoSrc: LogoSrc;
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
  passageiro: string | null;
  origem: string | null;
  destino: string | null;
  dataVoo: string | null;
  horarioVoo: string | null;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Documento de Solicitação (Compra, Pagamento, Exame Médico ou Reembolso) — segue o modelo de
 * formulário impresso já usado pelo clube: logo centralizado no topo, faixa com o título, tabela
 * de dados (rótulo em vinho, valor em azul), lista de itens só em Compra, e bloco de 4 assinaturas
 * em branco pra imprimir e assinar.
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
  if (solicitacao.tipo === "passagem_aerea") {
    linhas.push({ label: "Passageiro", value: solicitacao.passageiro ?? "" });
    linhas.push({ label: "Origem", value: solicitacao.origem ?? "" });
    linhas.push({ label: "Destino", value: solicitacao.destino ?? "" });
    linhas.push({
      label: "Data e Horário do Voo",
      value: `${formatDataBr(solicitacao.dataVoo)}${solicitacao.horarioVoo ? ` às ${solicitacao.horarioVoo.slice(0, 5)}` : ""}`,
    });
  }
  if (solicitacao.valor !== null) {
    linhas.push({
      label: solicitacao.tipo === "reembolso" ? "Valor a Reembolsar" : "Valor a Pagar",
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

        {solicitacao.tipo === "compra" ? (
          <>
            <View style={styles.itensBar}>
              <Text style={styles.itensBarTexto}>Itens Solicitados:</Text>
            </View>
            <View style={styles.itensTable}>
              <View style={styles.itensHeaderRow}>
                <Text style={[styles.colFoto, sharedStyles.headerCell]}>Foto</Text>
                <Text style={[styles.colQuantidade, sharedStyles.headerCell]}>Quantidade</Text>
                <Text style={[styles.colItem, sharedStyles.headerCell]}>Item</Text>
              </View>
              {itens.length === 0 ? (
                <Text style={sharedStyles.emptyState}>Nenhum item adicionado ainda.</Text>
              ) : (
                itens.map((item, i) => (
                  <View
                    style={[
                      styles.itensRowBase,
                      item.fotoSrc ? styles.itensRowComFoto : styles.itensRowSemFoto,
                    ]}
                    key={i}
                    wrap={false}
                  >
                    <View style={styles.colFoto}>
                      {item.fotoSrc ? (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <Image style={styles.fotoItem} src={item.fotoSrc as string} />
                      ) : null}
                    </View>
                    <Text style={styles.colQuantidade}>{item.quantidade}</Text>
                    <Text style={styles.colItem}>{item.item}</Text>
                  </View>
                ))
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
