import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow, PessoaTipoRooming } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, DocumentoHeader, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  hotelBox: {
    marginTop: 4,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  hotelLinha: { fontSize: 9.5, color: "#404040", marginBottom: 2 },
  hotelLabel: { fontWeight: 700, color: CORES.grenaEscuro },
  tabela: {
    borderWidth: 0.5,
    borderColor: "#c7c7c7",
    borderRadius: 3,
    overflow: "hidden",
  },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: CORES.grenaEscuro,
  },
  headerCell: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colApartamento: {
    width: 100,
    borderRightWidth: 0.5,
    borderRightColor: "#c7c7c7",
  },
  colAtletas: { flex: 1 },
  grupoQuarto: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#c7c7c7",
  },
  grupoPar: { backgroundColor: "#ffffff" },
  grupoImpar: { backgroundColor: "#f2f2f2" },
  colApartamentoCorpo: {
    width: 100,
    borderRightWidth: 0.5,
    borderRightColor: "#c7c7c7",
  },
  colAtletasCorpo: { flex: 1, paddingVertical: 2 },
  nomeLinha: {
    fontSize: 8.5,
    color: "#262626",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  nomeExtra: { color: "#8a8a8a", fontSize: 7.5 },
  emptyState: { fontSize: 8, color: "#a3a3a3", paddingVertical: 6, paddingHorizontal: 8 },
});

const EXTRA_LABEL: Partial<Record<PessoaTipoRooming, string>> = {
  comissao: "Comissão Técnica",
  staff: "Staff",
};

export interface RoomingListPdfOcupante {
  nome: string;
  tipo: PessoaTipoRooming;
  dataNascimento: string | null;
  cpf: string | null;
  rg: string | null;
}

export interface RoomingListPdfQuarto {
  numero: number;
  ocupantes: RoomingListPdfOcupante[];
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
          <View style={styles.tabela}>
            <View style={styles.linhaCabecalho}>
              <Text style={[styles.colApartamento, styles.headerCell]}>Apartamento</Text>
              <Text style={[styles.colAtletas, styles.headerCell]}>Atletas</Text>
            </View>

            {quartos.map((q, i) => {
              // Atletas primeiro, depois Comissão Técnica, depois Staff — separa visualmente quem é
              // quem dentro do mesmo quarto.
              const ordem: PessoaTipoRooming[] = ["atleta", "comissao", "staff"];
              const ocupantesOrdenados = [...q.ocupantes].sort(
                (a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo),
              );
              return (
                <View
                  key={q.numero}
                  style={[styles.grupoQuarto, i % 2 === 0 ? styles.grupoPar : styles.grupoImpar]}
                  wrap={false}
                >
                  {/* Coluna do apartamento fica em branco de propósito — o número real só chega
                      depois que o hotel confirma, e aí é preenchido à mão neste espaço. */}
                  <View style={styles.colApartamentoCorpo} />
                  <View style={styles.colAtletasCorpo}>
                    {ocupantesOrdenados.length === 0 ? (
                      <Text style={styles.emptyState}>Sem ocupantes.</Text>
                    ) : (
                      ocupantesOrdenados.map((o, j) => (
                        <Text key={j} style={styles.nomeLinha}>
                          {o.nome}
                          {EXTRA_LABEL[o.tipo] ? <Text style={styles.nomeExtra}> — {EXTRA_LABEL[o.tipo]}</Text> : null}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
