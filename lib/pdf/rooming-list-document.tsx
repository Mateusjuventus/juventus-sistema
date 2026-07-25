import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow, PessoaTipoRooming } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, DocumentoHeader, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  hotelBox: {
    marginTop: 2,
    marginBottom: 8,
    padding: 7,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  hotelLinha: { fontSize: 8.5, color: "#404040", marginBottom: 1 },
  hotelLabel: { fontWeight: 700, color: CORES.grenaEscuro },
  secaoTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    marginBottom: 3,
    marginTop: 7,
  },
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
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  colApartamento: { width: 52, borderRightWidth: 0.5, borderRightColor: "#c7c7c7" },
  colNome: { flex: 1.7 },
  colNascimento: { width: 48 },
  colCpf: { width: 62 },
  colRg: { width: 52 },
  grupoQuarto: {
    borderTopWidth: 0.5,
    borderTopColor: "#c7c7c7",
  },
  grupoPar: { backgroundColor: "#ffffff" },
  grupoImpar: { backgroundColor: "#f2f2f2" },
  linhaOcupante: { flexDirection: "row", alignItems: "center" },
  colApartamentoCorpo: {
    width: 52,
    borderRightWidth: 0.5,
    borderRightColor: "#c7c7c7",
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  aptoTexto: { fontSize: 8, fontWeight: 700, color: CORES.grenaEscuro },
  celula: {
    fontSize: 7.5,
    color: "#262626",
    paddingVertical: 1.5,
    paddingHorizontal: 6,
  },
  colNomeCorpo: { flex: 1.7 },
  colNascimentoCorpo: { width: 48 },
  colCpfCorpo: { width: 62 },
  colRgCorpo: { width: 52 },
  nomeExtra: { color: "#8a8a8a", fontSize: 7 },
  emptyState: { fontSize: 8, color: "#a3a3a3", paddingVertical: 5, paddingHorizontal: 8 },
});

const EXTRA_LABEL: Partial<Record<PessoaTipoRooming, string>> = {
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
  numeroApartamento: string | null;
  ocupantes: RoomingListPdfOcupante[];
}

/** Uma seção de quartos filtrada por grupo de pessoa (Atletas, ou Comissão Técnica/Staff) — cada
 * quarto vira um grupo de linhas (uma por ocupante), com o número do apartamento exibido uma única
 * vez no topo do grupo. O número vem preenchido direto no sistema assim que o hotel confirma; até
 * lá a coluna fica em branco. */
function TabelaQuartos({
  titulo,
  quartos,
  mensagemVazia,
}: {
  titulo: string;
  quartos: RoomingListPdfQuarto[];
  mensagemVazia: string;
}) {
  return (
    <View wrap={false}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      {quartos.length === 0 ? (
        <Text style={sharedStyles.emptyState}>{mensagemVazia}</Text>
      ) : (
        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={[styles.colApartamento, styles.headerCell]}>Apto</Text>
            <Text style={[styles.colNome, styles.headerCell]}>Nome completo</Text>
            <Text style={[styles.colNascimento, styles.headerCell]}>Nasc.</Text>
            <Text style={[styles.colCpf, styles.headerCell]}>CPF</Text>
            <Text style={[styles.colRg, styles.headerCell]}>RG</Text>
          </View>

          {quartos.map((q, i) => (
            <View
              key={q.numero}
              style={[styles.grupoQuarto, i % 2 === 0 ? styles.grupoPar : styles.grupoImpar]}
              wrap={false}
            >
              {q.ocupantes.map((o, j) => (
                <View key={j} style={styles.linhaOcupante}>
                  <View style={styles.colApartamentoCorpo}>
                    {j === 0 ? <Text style={styles.aptoTexto}>{q.numeroApartamento || "—"}</Text> : null}
                  </View>
                  <Text style={[styles.colNomeCorpo, styles.celula]}>
                    {o.nome}
                    {EXTRA_LABEL[o.tipo] ? <Text style={styles.nomeExtra}> — {EXTRA_LABEL[o.tipo]}</Text> : null}
                  </Text>
                  <Text style={[styles.colNascimentoCorpo, styles.celula]}>{formatDataBr(o.dataNascimento)}</Text>
                  <Text style={[styles.colCpfCorpo, styles.celula]}>{o.cpf ?? "—"}</Text>
                  <Text style={[styles.colRgCorpo, styles.celula]}>{o.rg ?? "—"}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
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
  const quartosAtletas = quartos
    .map((q) => ({ numero: q.numero, numeroApartamento: q.numeroApartamento, ocupantes: q.ocupantes.filter((o) => o.tipo === "atleta") }))
    .filter((q) => q.ocupantes.length > 0);

  const quartosComissao = quartos
    .map((q) => ({ numero: q.numero, numeroApartamento: q.numeroApartamento, ocupantes: q.ocupantes.filter((o) => o.tipo !== "atleta") }))
    .filter((q) => q.ocupantes.length > 0);

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
          <>
            <TabelaQuartos
              titulo="Atletas"
              quartos={quartosAtletas}
              mensagemVazia="Nenhum atleta com quarto atribuído."
            />
            <TabelaQuartos
              titulo="Comissão Técnica"
              quartos={quartosComissao}
              mensagemVazia="Nenhum integrante da comissão técnica com quarto atribuído."
            />
          </>
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
