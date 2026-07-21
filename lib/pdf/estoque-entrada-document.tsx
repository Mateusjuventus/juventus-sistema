import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import { labelUnidade } from "@/lib/estoque/labels";
import type { EstoqueCategoria } from "@/lib/supabase/types";

const TITULOS: Record<EstoqueCategoria, string> = {
  esportivo: "Material Esportivo",
  medico: "Material Médico",
};

const SUBTITULOS: Record<EstoqueCategoria, string> = {
  esportivo: "Departamento de Futebol Profissional",
  medico: "Departamento Médico",
};

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
  subtituloTexto: {
    fontSize: 8,
    color: "#ffffff",
    opacity: 0.9,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  sectionBar: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: CORES.grena,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  sectionBarTexto: { fontSize: 9, fontWeight: 700, color: "#ffffff", textTransform: "uppercase" },
  infoTable: { borderWidth: 1, borderTopWidth: 0, borderColor: "#262626" },
  infoRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#a3a3a3" },
  infoRowUltima: { flexDirection: "row" },
  infoLabelCell: {
    width: 100,
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
  itensTable: { borderWidth: 1, borderTopWidth: 0, borderColor: "#262626" },
  itensHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a3a3a3",
    paddingVertical: 3,
  },
  itensRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 3,
  },
  colDivisor: { borderRightWidth: 0.5, borderRightColor: "#d4d4d4" },
  colDescricao: { width: 250, fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colTamanho: { width: 70, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colCodigo: { width: 70, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  colQtd: { flex: 1, textAlign: "center", fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
  totalRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#a3a3a3", paddingVertical: 4 },
  totalLabelCell: { width: 390, textAlign: "right", paddingHorizontal: 8 },
  totalLabelTexto: { fontSize: 8.5, fontWeight: 700, color: "#171717" },
  totalValorCell: { flex: 1, textAlign: "center" },
  totalValorTexto: { fontSize: 8.5, fontWeight: 700, color: "#171717" },
  notaRodape: { fontSize: 7.5, color: "#737373", marginTop: 8, lineHeight: 1.3, textAlign: "center" },
});

export interface EstoqueEntradaPdfItem {
  nome: string;
  tamanho: string | null;
  codigo: string | null;
  quantidade: number;
}

export interface EstoqueEntradaPdfData {
  categoria: EstoqueCategoria;
  numero: number;
  data: string;
  fornecedor: string | null;
  notaFiscal: string | null;
  observacoes: string | null;
}

/**
 * Comprovante de Entrada de Estoque (Esportivo ou Médico) — reposição de material que chegou.
 * Diferente da EstoqueFichaDocument (usada nas Saídas), aqui não há declaração de responsabilidade
 * nem bloco de assinaturas: Entrada é só um registro de recebimento (com fornecedor/nota fiscal),
 * ninguém precisa assinar recebendo material de volta pro próprio estoque do clube.
 */
export function EstoqueEntradaDocument({
  juventusLogoSrc,
  entrada,
  itens,
  subtitulo,
}: {
  juventusLogoSrc: LogoSrc;
  entrada: EstoqueEntradaPdfData;
  itens: EstoqueEntradaPdfItem[];
  /** Substitui o subtítulo padrão calculado por SUBTITULOS[entrada.categoria] — usado pelo Futebol
   * de Base, já que lá o subtítulo fixo "Departamento de Futebol Profissional" não se aplica. */
  subtitulo?: string;
}) {
  const totalQtd = itens.reduce((soma, i) => soma + i.quantidade, 0);

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
          <Text style={styles.tituloTexto}>Comprovante de Entrada — {TITULOS[entrada.categoria]}</Text>
          <Text style={styles.subtituloTexto}>{subtitulo ?? SUBTITULOS[entrada.categoria]}</Text>
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>
            Dados da Entrada — Nº {String(entrada.numero).padStart(4, "0")}
          </Text>
        </View>
        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Data</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{formatDataBr(entrada.data)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Fornecedor</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{entrada.fornecedor || "—"}</Text>
            </View>
          </View>
          <View style={styles.infoRowUltima}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Nota Fiscal</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{entrada.notaFiscal || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>Itens Recebidos</Text>
        </View>
        <View style={styles.itensTable}>
          <View style={styles.itensHeaderRow}>
            <Text style={[styles.colDescricao, styles.colDivisor, sharedStyles.headerCell]}>Descrição</Text>
            <Text style={[styles.colTamanho, styles.colDivisor, sharedStyles.headerCell]}>
              {labelUnidade(entrada.categoria)}
            </Text>
            <Text style={[styles.colCodigo, styles.colDivisor, sharedStyles.headerCell]}>Código</Text>
            <Text style={[styles.colQtd, sharedStyles.headerCell]}>Qtd.</Text>
          </View>
          {itens.length === 0 ? (
            <Text style={sharedStyles.emptyState}>Nenhum item nesta entrada.</Text>
          ) : (
            itens.map((item, i) => (
              <View style={styles.itensRow} key={i} wrap={false}>
                <Text style={[styles.colDescricao, styles.colDivisor]}>{item.nome}</Text>
                <Text style={[styles.colTamanho, styles.colDivisor]}>{item.tamanho || "—"}</Text>
                <Text style={[styles.colCodigo, styles.colDivisor]}>{item.codigo || "—"}</Text>
                <Text style={styles.colQtd}>{item.quantidade}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <View style={styles.totalLabelCell}>
              <Text style={styles.totalLabelTexto}>Total de itens:</Text>
            </View>
            <View style={styles.totalValorCell}>
              <Text style={styles.totalValorTexto}>{totalQtd}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoTable}>
          <View style={styles.infoRowUltima}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Observações</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{entrada.observacoes || "—"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.notaRodape}>
          Este documento serve como comprovante interno de recebimento de material.
        </Text>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
