import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import { CORES, DocumentoHeader, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  onibusBox: {
    marginTop: 10,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  onibusTitulo: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro, marginBottom: 4 },
  passageiroNome: { fontSize: 9.5, color: "#404040", marginBottom: 1 },
});

export interface OnibusPdfItem {
  numero: number;
  horario: string | null;
  passageiros: string[];
}

export function OnibusDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  onibus,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  onibus: OnibusPdfItem[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Lista de Passageiros do Ônibus"
        />

        {onibus.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum ônibus registrado.</Text>
        ) : (
          onibus.map((o) => (
            <View style={styles.onibusBox} key={o.numero} wrap={false}>
              <Text style={styles.onibusTitulo}>
                Ônibus {o.numero}
                {o.horario ? ` — Saída ${o.horario}` : ""}
              </Text>
              {o.passageiros.length === 0 ? (
                <Text style={styles.passageiroNome}>Sem passageiros.</Text>
              ) : (
                o.passageiros.map((nome, i) => (
                  <Text style={styles.passageiroNome} key={i}>
                    {nome}
                  </Text>
                ))
              )}
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}
