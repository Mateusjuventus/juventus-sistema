import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import { valorPorExtenso } from "./valor-extenso";

/**
 * Termo de Responsabilidade — Retirada de Materiais (ver
 * docs/superpowers/specs/2026-08-11-termos-retirada-design.md). Segue o mesmo desenho da ficha de
 * Saída do Estoque (lib/pdf/estoque-ficha-document.tsx), que é o formulário impresso já em uso:
 * cabeçalho com escudo, dados de quem retira, tabela dos materiais, declaração e assinaturas.
 *
 * O texto de responsabilidade vem PRONTO do termo (foi gravado junto do documento) — este arquivo
 * não decide redação nenhuma, pra um termo antigo continuar imprimindo exatamente o que foi
 * assinado na época.
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
    marginTop: 10,
    marginBottom: 4,
  },
  sectionBarTexto: { fontSize: 8.5, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },

  infoRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  infoLabelCell: { width: 92, backgroundColor: "#fafafa", padding: 4 },
  infoValorCell: { flex: 1, padding: 4 },
  infoLabelTexto: { fontSize: 7.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  infoValorTexto: { fontSize: 9, color: "#262626" },

  tabelaHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 4 },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    minHeight: 18,
  },
  colItem: { width: 24, textAlign: "center" },
  colDescricao: { flex: 1, paddingHorizontal: 4 },
  colQtd: { width: 46, textAlign: "center" },
  colValor: { width: 78, textAlign: "right", paddingRight: 4 },
  headerCell: { fontSize: 7.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  cell: { fontSize: 9, color: "#262626" },
  cellMuted: { fontSize: 9, color: "#a3a3a3" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: CORES.dourado,
  },
  totalLabel: { fontSize: 10, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },
  totalValor: { fontSize: 12, fontWeight: 700, color: CORES.grena },
  totalExtenso: { fontSize: 7.5, color: "#737373", marginTop: 2, fontStyle: "italic" },

  declaracao: { fontSize: 8.5, color: "#262626", lineHeight: 1.5, marginTop: 4, textAlign: "justify" },

  assinaturasGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  assinaturaCol: { width: "31%", alignItems: "center" },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#737373", width: "100%", marginBottom: 6 },
  assinaturaLabel: { fontSize: 8.5, fontWeight: 700, color: CORES.grenaEscuro, textAlign: "center" },
  assinaturaExtra: { fontSize: 7.5, color: "#525252", textAlign: "center", marginTop: 2 },

  devolucaoBox: {
    marginTop: 14,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 3,
    padding: 8,
  },
  devolucaoTitulo: { fontSize: 8.5, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase" },
  devolucaoTexto: { fontSize: 8.5, color: "#404040", marginTop: 3 },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface TermoRetiradaPdfItem {
  descricao: string;
  quantidade: number;
  valorUnitario: number | null;
}

export interface TermoRetiradaPdfDados {
  numero: number;
  data: string;
  tipo: "emprestimo" | "definitiva";
  responsavelNome: string;
  responsavelDocumento: string | null;
  funcao: string | null;
  departamento: string | null;
  finalidade: string | null;
  previsaoDevolucao: string | null;
  textoResponsabilidade: string;
  observacoes: string | null;
  devolvidoEm: string | null;
  devolucaoObservacoes: string | null;
}

export function TermoRetiradaDocument({
  juventusLogoSrc,
  termo,
  itens,
  total,
}: {
  juventusLogoSrc: LogoSrc;
  termo: TermoRetiradaPdfDados;
  itens: TermoRetiradaPdfItem[];
  total: number;
}) {
  const info: { label: string; valor: string }[] = [
    { label: "Nome", valor: termo.responsavelNome },
    { label: "RG / CPF", valor: termo.responsavelDocumento ?? "" },
    { label: "Função", valor: termo.funcao ?? "" },
    { label: "Departamento", valor: termo.departamento ?? "" },
    { label: "Finalidade", valor: termo.finalidade ?? "" },
    { label: "Data", valor: formatDataBr(termo.data) },
  ];
  if (termo.tipo === "emprestimo") {
    // Sem data marcada, a devolução não é "indefinida": ela acontece quando o vínculo/função
    // termina ou quando o clube pedir — que é o que a própria declaração diz. Imprimir isso vale
    // mais do que um traço (pedido do Mateus: material de trabalho não tem prazo fixo).
    info.push({
      label: "Devolução",
      valor: termo.previsaoDevolucao
        ? `Até ${formatDataBr(termo.previsaoDevolucao)}`
        : "Ao término do vínculo/função ou quando solicitado pelo Clube",
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
          <Text style={styles.tituloTexto}>Termo de Responsabilidade — Retirada de Materiais</Text>
          <Text style={styles.subtituloTexto}>
            {termo.tipo === "emprestimo" ? "Empréstimo — com devolução" : "Retirada definitiva"}
          </Text>
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>
            Dados de quem retira — Termo Nº {String(termo.numero).padStart(4, "0")}
          </Text>
        </View>
        <View>
          {info.map((linha) => (
            <View style={styles.infoRow} key={linha.label}>
              <View style={styles.infoLabelCell}>
                <Text style={styles.infoLabelTexto}>{linha.label}</Text>
              </View>
              <View style={styles.infoValorCell}>
                <Text style={styles.infoValorTexto}>{linha.valor || "—"}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>Materiais retirados</Text>
        </View>
        <View style={styles.tabelaHeader}>
          <Text style={[styles.colItem, styles.headerCell]}>#</Text>
          <Text style={[styles.colDescricao, styles.headerCell]}>Descrição</Text>
          <Text style={[styles.colQtd, styles.headerCell]}>Qtd.</Text>
          <Text style={[styles.colValor, styles.headerCell]}>Valor un.</Text>
          <Text style={[styles.colValor, styles.headerCell]}>Total</Text>
        </View>
        {itens.map((item, i) => {
          const totalItem = item.valorUnitario === null ? null : item.quantidade * item.valorUnitario;
          return (
            <View style={styles.tabelaLinha} key={i}>
              <Text style={[styles.colItem, styles.cell]}>{i + 1}</Text>
              <Text style={[styles.colDescricao, styles.cell]}>{item.descricao}</Text>
              <Text style={[styles.colQtd, styles.cell]}>{item.quantidade}</Text>
              <Text style={[styles.colValor, item.valorUnitario === null ? styles.cellMuted : styles.cell]}>
                {item.valorUnitario === null ? "—" : formatMoeda(item.valorUnitario)}
              </Text>
              <Text style={[styles.colValor, totalItem === null ? styles.cellMuted : styles.cell]}>
                {totalItem === null ? "—" : formatMoeda(totalItem)}
              </Text>
            </View>
          );
        })}

        {total > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Valor total sugerido</Text>
            <View>
              <Text style={styles.totalValor}>{formatMoeda(total)}</Text>
              <Text style={styles.totalExtenso}>({valorPorExtenso(total)})</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>Declaração de responsabilidade</Text>
        </View>
        {termo.textoResponsabilidade
          .split(/\n{2,}/)
          .map((paragrafo) => paragrafo.trim())
          .filter((paragrafo) => paragrafo.length > 0)
          .map((paragrafo, i) => (
            <Text style={styles.declaracao} key={i}>
              {paragrafo}
            </Text>
          ))}

        {termo.observacoes ? (
          <>
            <View style={styles.sectionBar}>
              <Text style={styles.sectionBarTexto}>Observações</Text>
            </View>
            <Text style={styles.declaracao}>{termo.observacoes}</Text>
          </>
        ) : null}

        <View style={styles.assinaturasGrid} wrap={false}>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Assinatura de quem entrega</Text>
            <Text style={styles.assinaturaExtra}>Data: ____/____/______</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Assinatura de quem retira</Text>
            <Text style={styles.assinaturaExtra}>{termo.responsavelNome}</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Testemunha</Text>
            <Text style={styles.assinaturaExtra}>Data: ____/____/______</Text>
          </View>
        </View>

        {termo.tipo === "emprestimo" ? (
          <View style={styles.devolucaoBox} wrap={false}>
            <Text style={styles.devolucaoTitulo}>Devolução</Text>
            {termo.devolvidoEm ? (
              <>
                <Text style={styles.devolucaoTexto}>
                  Material devolvido em {formatDataBr(termo.devolvidoEm)}.
                </Text>
                {termo.devolucaoObservacoes ? (
                  <Text style={styles.devolucaoTexto}>{termo.devolucaoObservacoes}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.devolucaoTexto}>
                  Recebi de volta os materiais acima em ____/____/______, nas condições verificadas no ato.
                </Text>
                <Text style={[styles.devolucaoTexto, { marginTop: 16 }]}>
                  Assinatura de quem recebe a devolução: ______________________________
                </Text>
              </>
            )}
          </View>
        ) : null}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
