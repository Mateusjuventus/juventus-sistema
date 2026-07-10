import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import { DocumentoFooter, DocumentoHeader, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  table: { marginTop: 4 },
  colNome: { flex: 1.4 },
  colTipo: { width: 90 },
  colZona: { width: 90 },
  colFuncao: { flex: 1 },
  colExtra: { width: 60, textAlign: "center" },
});

export interface CredenciamentoPdfItem {
  nome: string;
  tipo: string;
  zona: string;
  funcao: string;
  vagaExtra: boolean;
}

export function CredenciamentoDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  itens,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  itens: CredenciamentoPdfItem[];
}) {
  const ordenados = [...itens].sort((a, b) => a.zona.localeCompare(b.zona) || a.nome.localeCompare(b.nome));

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Credenciamento por Zona"
        />

        <View style={styles.table}>
          <View style={sharedStyles.tableHeaderRow}>
            <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
            <Text style={[styles.colTipo, sharedStyles.headerCell]}>Origem</Text>
            <Text style={[styles.colZona, sharedStyles.headerCell]}>Zona</Text>
            <Text style={[styles.colFuncao, sharedStyles.headerCell]}>Função</Text>
            <Text style={[styles.colExtra, sharedStyles.headerCell]}>Extra</Text>
          </View>
          {ordenados.length === 0 ? (
            <Text style={sharedStyles.emptyState}>Nenhum credenciamento registrado.</Text>
          ) : (
            ordenados.map((item, i) => (
              <View style={sharedStyles.tableRow} key={i} wrap={false}>
                <Text style={styles.colNome}>{item.nome}</Text>
                <Text style={styles.colTipo}>{item.tipo}</Text>
                <Text style={styles.colZona}>{item.zona}</Text>
                <Text style={styles.colFuncao}>{item.funcao}</Text>
                <Text style={styles.colExtra}>{item.vagaExtra ? "Sim" : "—"}</Text>
              </View>
            ))
          )}
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
