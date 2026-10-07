import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { FISIOTERAPIA_STATUS_DIA_COR, FISIOTERAPIA_STATUS_DIA_LABEL } from "@/lib/futebol/fisioterapia";
import type { FisioterapiaStatusDia } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relatório Diário da Fisioterapia — ver docs/superpowers/specs/2026-10-07-relatorio-dia-
 * fisioterapia-design.md, seção 3. Componente compartilhado por Profissional e Base (mesmo padrão
 * de `fisioterapia-relatorio-geral-document.tsx`): a rota de cada departamento já busca, ordena e
 * agrupa os itens antes de passar pra aqui — este componente só desenha. Um cabeçalho de categoria
 * novo entra sempre que `categoria` muda de um item pro próximo (a Base passa `categoria`
 * preenchida, já na ordem de `CATEGORIAS_BASE`; o Profissional não passa nenhuma, então nunca entra
 * nenhum cabeçalho — lista única em ordem alfabética).
 */

const MESES_POR_EXTENSO = [
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

/** Formata uma data "AAAA-MM-DD" por extenso em português (ex.: "07 de outubro de 2026") — sem
 * depender do fuso horário de onde o PDF é renderizado (mesmo cuidado de `formatCarimbo`), já que
 * aqui não há hora envolvida, só a data: montar um `Date` com `Date.UTC` e ler de volta com os
 * métodos `getUTC*` evita o "1 dia antes" que `new Date("2026-10-07")` mais `getDate()` local pode
 * dar dependendo do fuso do processo. */
export function formatDataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return `${String(data.getUTCDate()).padStart(2, "0")} de ${MESES_POR_EXTENSO[data.getUTCMonth()]} de ${data.getUTCFullYear()}`;
}

export interface FisioterapiaRelatorioDiaItem {
  nome: string;
  /** Rótulo já pronto pra exibir (ex.: "Sub-17") — `null`/ausente no Profissional, que não agrupa. */
  categoria?: string | null;
  statusDia: FisioterapiaStatusDia | null;
  descricao: string;
}

const styles = StyleSheet.create({
  headerLogo: { width: 50, height: 62, alignSelf: "center", objectFit: "contain", marginTop: 2 },
  titulo: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4 },
  dataExtenso: { textAlign: "center", fontSize: 9.5, fontWeight: 700, color: CORES.grena, marginTop: 2, marginBottom: 14 },
  categoriaTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemBox: { marginTop: 10, paddingHorizontal: 2 },
  itemNomeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemNome: { fontSize: 9.5, fontWeight: 700, color: "#1f1f1f" },
  etiqueta: { fontSize: 7.5, fontWeight: 700, color: "#ffffff", borderRadius: 8, paddingVertical: 1.5, paddingHorizontal: 6 },
  itemTexto: { fontSize: 8.5, color: "#404040", marginTop: 3, lineHeight: 1.4 },
});

export function FisioterapiaRelatorioDiaDocument({
  juventusLogoSrc,
  departamentoLabel,
  data,
  itens,
}: {
  juventusLogoSrc: LogoSrc;
  departamentoLabel: string;
  data: string;
  itens: FisioterapiaRelatorioDiaItem[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relatório Diário da Fisioterapia</Text>
        <Text style={styles.subtitulo}>{departamentoLabel}</Text>
        <Text style={styles.dataExtenso}>{formatDataPorExtenso(data)}</Text>

        {itens.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum atendimento registrado nesta data.</Text>
        ) : (
          itens.map((item, i) => {
            const novaCategoria = Boolean(item.categoria) && item.categoria !== itens[i - 1]?.categoria;
            return (
              <View key={i}>
                {novaCategoria ? <Text style={styles.categoriaTitulo}>{item.categoria}</Text> : null}
                <View style={styles.itemBox} wrap={false}>
                  <View style={styles.itemNomeRow}>
                    <Text style={styles.itemNome}>{item.nome}</Text>
                    {item.statusDia ? (
                      <Text style={[styles.etiqueta, { backgroundColor: FISIOTERAPIA_STATUS_DIA_COR[item.statusDia] }]}>
                        {FISIOTERAPIA_STATUS_DIA_LABEL[item.statusDia]}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemTexto}>{item.descricao}</Text>
                </View>
              </View>
            );
          })
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
