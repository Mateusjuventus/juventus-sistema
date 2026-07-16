import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import type { EstoqueCategoria } from "@/lib/supabase/types";

const TITULOS: Record<EstoqueCategoria, string> = {
  esportivo: "Material Esportivo",
  medico: "Material Médico",
};

const SUBTITULOS: Record<EstoqueCategoria, string> = {
  esportivo: "Departamento de Futebol Profissional",
  medico: "Departamento Médico",
};

/** Mesmo texto de declaração usado no formulário impresso já em uso pelo clube. */
const PARAGRAFOS_DECLARACAO = [
  "Declaro que recebi do Clube os uniformes e/ou equipamentos relacionados acima, comprometendo-me a utilizá-los exclusivamente durante a jornada de trabalho e no exercício de minhas atividades profissionais.",
  "Comprometo-me, ainda, a zelar pela conservação dos itens recebidos e a devolvê-los em perfeitas condições de uso, ressalvado o desgaste natural decorrente da utilização regular, no ato da rescisão do meu contrato de trabalho ou sempre que solicitado pelo Clube.",
  "Fico ciente de que a não devolução dos itens, ou a devolução em condições incompatíveis com o desgaste natural de uso, poderá acarretar o desconto dos respectivos valores, conforme o custo individual de cada item, observada a legislação trabalhista vigente.",
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
  declaracaoBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#262626",
    backgroundColor: "#FAFAFA",
    padding: 10,
  },
  declaracaoTexto: { fontSize: 7.5, color: "#333333", lineHeight: 1.4, textAlign: "justify", marginBottom: 6 },
  fecho: { height: 8, backgroundColor: CORES.grena, marginTop: 8 },
  assinaturasGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 26 },
  assinaturaCol: { width: "31%", alignItems: "center", marginBottom: 20 },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#737373", width: "100%", marginBottom: 6 },
  assinaturaLabel: { fontSize: 8.5, fontWeight: 700, color: CORES.grenaEscuro, textAlign: "center" },
  assinaturaExtra: { fontSize: 7.5, color: "#525252", textAlign: "center", marginTop: 2 },
  notaRodape: { fontSize: 7.5, color: "#737373", marginTop: 3, lineHeight: 1.3, textAlign: "center" },
});

export interface EstoqueFichaPdfItem {
  nome: string;
  tamanho: string | null;
  codigo: string | null;
  quantidade: number;
}

export interface EstoqueFichaPdfData {
  categoria: EstoqueCategoria;
  /** null = ficha em branco, pra imprimir e preencher à mão. */
  numero: number | null;
  data: string | null;
  nomeDestinatario: string | null;
  funcao: string | null;
  departamento: string | null;
  observacoes: string | null;
}

const QTD_LINHAS_BRANCO = 10;

/**
 * Ficha de Saída de Estoque (Esportivo ou Médico) — mesmo modelo do formulário impresso já usado
 * pelo clube: logo centralizado no topo, faixa com o título (varia conforme a categoria), dados do
 * colaborador, tabela de materiais entregues, declaração de responsabilidade e bloco de 3
 * assinaturas em branco pra imprimir e assinar. Quando `ficha.numero` é null, gera a versão em
 * branco (10 linhas vazias, campos em branco), usada pra preencher à mão quando não há computador
 * à mão na hora da entrega.
 */
export function EstoqueFichaDocument({
  juventusLogoSrc,
  ficha,
  itens,
}: {
  juventusLogoSrc: LogoSrc;
  ficha: EstoqueFichaPdfData;
  itens: EstoqueFichaPdfItem[];
}) {
  const emBranco = ficha.numero === null;
  const totalQtd = itens.reduce((soma, i) => soma + i.quantidade, 0);
  const linhasBranco = emBranco ? Array.from({ length: QTD_LINHAS_BRANCO }) : [];

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
          <Text style={styles.tituloTexto}>{TITULOS[ficha.categoria]}</Text>
          <Text style={styles.subtituloTexto}>{SUBTITULOS[ficha.categoria]}</Text>
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>
            Dados do Colaborador — Ficha Nº {emBranco ? "____________" : String(ficha.numero).padStart(4, "0")}
          </Text>
        </View>
        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Nome</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{emBranco ? " " : ficha.nomeDestinatario}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Data</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>
                {emBranco ? "____ / ____ / ________" : formatDataBr(ficha.data)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Função</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{emBranco ? " " : ficha.funcao || "—"}</Text>
            </View>
          </View>
          <View style={styles.infoRowUltima}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Departamento</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>
                {emBranco
                  ? "[ ] Administrativo  [ ] Técnico  [ ] Médico  [ ] Operacional  [ ] Limpeza  [ ] Lavanderia  [ ] Serviços Gerais  [ ] Portaria  [ ] Outros: __________"
                  : ficha.departamento || "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>Relação de Materiais Entregues</Text>
        </View>
        <View style={styles.itensTable}>
          <View style={styles.itensHeaderRow}>
            <Text style={[styles.colDescricao, styles.colDivisor, sharedStyles.headerCell]}>Descrição</Text>
            <Text style={[styles.colTamanho, styles.colDivisor, sharedStyles.headerCell]}>Tamanho</Text>
            <Text style={[styles.colCodigo, styles.colDivisor, sharedStyles.headerCell]}>Código</Text>
            <Text style={[styles.colQtd, sharedStyles.headerCell]}>Qtd.</Text>
          </View>
          {emBranco ? (
            linhasBranco.map((_, i) => (
              <View style={styles.itensRow} key={i} wrap={false}>
                <Text style={[styles.colDescricao, styles.colDivisor]}> </Text>
                <Text style={[styles.colTamanho, styles.colDivisor]}> </Text>
                <Text style={[styles.colCodigo, styles.colDivisor]}> </Text>
                <Text style={styles.colQtd}> </Text>
              </View>
            ))
          ) : itens.length === 0 ? (
            <Text style={sharedStyles.emptyState}>Nenhum item nesta ficha.</Text>
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
              <Text style={styles.totalValorTexto}>{emBranco ? " " : totalQtd}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoTable}>
          <View style={styles.infoRowUltima}>
            <View style={styles.infoLabelCell}>
              <Text style={styles.infoLabelTexto}>Observações</Text>
            </View>
            <View style={styles.infoValorCell}>
              <Text style={styles.infoValorTexto}>{emBranco ? " " : ficha.observacoes || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.declaracaoBox}>
          {PARAGRAFOS_DECLARACAO.map((paragrafo, i) => (
            <Text
              style={i === PARAGRAFOS_DECLARACAO.length - 1 ? [styles.declaracaoTexto, { marginBottom: 0 }] : styles.declaracaoTexto}
              key={i}
            >
              {paragrafo}
            </Text>
          ))}
        </View>

        <View style={styles.fecho} />

        <View style={styles.assinaturasGrid} wrap={false}>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Assinatura de quem entrega</Text>
            <Text style={styles.assinaturaExtra}>Data: ____/____/______</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Assinatura de quem recebe</Text>
            <Text style={styles.assinaturaExtra}>Data: ____/____/______</Text>
          </View>
          <View style={styles.assinaturaCol}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>Responsável pelo Setor</Text>
            <Text style={styles.assinaturaExtra}>Data: ____/____/______</Text>
            <Text style={styles.assinaturaExtra}>Nome: ________________</Text>
          </View>
        </View>

        <Text style={styles.notaRodape}>
          Este documento deve ser arquivado junto ao setor administrativo após assinatura de ambas as partes.
        </Text>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
