import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow, PessoaTipoRooming } from "@/lib/supabase/types";
import { formatCPF } from "@/lib/validation/cpf";
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
  quartoTitulo: { fontSize: 9.5, fontWeight: 700, color: CORES.grenaEscuro, marginBottom: 6 },
  tabela: { marginTop: 2 },
  linhaCabecalho: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    paddingBottom: 4,
    marginBottom: 3,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    alignItems: "center",
  },
  colTipo: { width: 60 },
  colNome: { flex: 1.4 },
  colNascimento: { width: 60 },
  colCpf: { width: 78 },
  colRg: { width: 70 },
  headerCell: { fontSize: 6.5, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellNome: { fontSize: 8, fontWeight: 700, color: "#1f1f1f" },
  tipoTag: {
    fontSize: 6,
    fontWeight: 700,
    color: CORES.grena,
    backgroundColor: "#f0ebee",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    textTransform: "uppercase",
    alignSelf: "flex-start",
  },
  emptyState: { fontSize: 8, color: "#a3a3a3", paddingVertical: 4 },
});

const TIPO_LABEL: Record<PessoaTipoRooming, string> = {
  atleta: "Atleta",
  comissao: "Comissão",
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
  tipo: "single" | "duplo";
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
          quartos.map((q) => {
            // Atletas primeiro, depois Comissão Técnica, depois Staff — separa visualmente quem é
            // quem dentro do mesmo quarto.
            const ordem: PessoaTipoRooming[] = ["atleta", "comissao", "staff"];
            const ocupantesOrdenados = [...q.ocupantes].sort(
              (a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo),
            );
            return (
              <View style={styles.quartoBox} key={q.numero} wrap={false}>
                <Text style={styles.quartoTitulo}>
                  Quarto {q.numero} — {q.tipo === "single" ? "Single" : "Duplo"}
                </Text>
                {ocupantesOrdenados.length === 0 ? (
                  <Text style={styles.emptyState}>Sem ocupantes.</Text>
                ) : (
                  <View style={styles.tabela}>
                    <View style={styles.linhaCabecalho}>
                      <Text style={[styles.colTipo, styles.headerCell]}>Tipo</Text>
                      <Text style={[styles.colNome, styles.headerCell]}>Nome Completo</Text>
                      <Text style={[styles.colNascimento, styles.headerCell]}>Nascimento</Text>
                      <Text style={[styles.colCpf, styles.headerCell]}>CPF</Text>
                      <Text style={[styles.colRg, styles.headerCell]}>RG</Text>
                    </View>
                    {ocupantesOrdenados.map((o, i) => (
                      <View style={styles.linha} key={i}>
                        <View style={styles.colTipo}>
                          <Text style={styles.tipoTag}>{TIPO_LABEL[o.tipo]}</Text>
                        </View>
                        <Text style={[styles.colNome, styles.cellNome]}>{o.nome}</Text>
                        <Text style={[styles.colNascimento, styles.cell]}>{formatDataBr(o.dataNascimento)}</Text>
                        <Text style={[styles.colCpf, styles.cell]}>{o.cpf ? formatCPF(o.cpf) : "—"}</Text>
                        <Text style={[styles.colRg, styles.cell]}>{o.rg ?? "—"}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
