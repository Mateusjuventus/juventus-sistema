import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, DocumentoHeader, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  hotelBox: {
    marginTop: 4,
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  hotelLinha: { fontSize: 9.5, color: "#404040", marginBottom: 2 },
  hotelLabel: { fontWeight: 700, color: CORES.grenaEscuro },
  quartoBox: {
    marginTop: 8,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  quartoTitulo: { fontSize: 9.5, fontWeight: 700, color: CORES.grenaEscuro, marginBottom: 4 },
  ocupanteNome: { fontSize: 9.5, color: "#404040" },
});

export interface RoomingListPdfQuarto {
  numero: number;
  tipo: "single" | "duplo";
  ocupantes: string[];
}

export function RoomingListDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  hotelNome,
  hotelEndereco,
  checkin,
  checkout,
  quartos,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  hotelNome: string | null;
  hotelEndereco: string | null;
  checkin: string | null;
  checkout: string | null;
  quartos: RoomingListPdfQuarto[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Rooming List"
        />

        <View style={styles.hotelBox}>
          <Text style={styles.hotelLinha}>
            <Text style={styles.hotelLabel}>Hotel: </Text>
            {hotelNome ?? "—"}
          </Text>
          <Text style={styles.hotelLinha}>
            <Text style={styles.hotelLabel}>Endereço: </Text>
            {hotelEndereco ?? "—"}
          </Text>
          <Text style={styles.hotelLinha}>
            <Text style={styles.hotelLabel}>Check-in: </Text>
            {formatDataBr(checkin)} <Text style={styles.hotelLabel}>  Check-out: </Text>
            {formatDataBr(checkout)}
          </Text>
        </View>

        {quartos.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum quarto registrado.</Text>
        ) : (
          quartos.map((q) => (
            <View style={styles.quartoBox} key={q.numero} wrap={false}>
              <Text style={styles.quartoTitulo}>
                Quarto {q.numero} — {q.tipo === "single" ? "Single" : "Duplo"}
              </Text>
              {q.ocupantes.length === 0 ? (
                <Text style={styles.ocupanteNome}>Sem ocupantes.</Text>
              ) : (
                q.ocupantes.map((nome, i) => (
                  <Text style={styles.ocupanteNome} key={i}>
                    {nome}
                  </Text>
                ))
              )}
            </View>
          ))
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
