import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow, PessoaTipoRooming } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, DocumentoHeader, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Versão da Rooming List para ENVIAR aos atletas e comissão técnica — sem nenhum dado pessoal
 * (sem Nascimento/CPF/RG, que só interessam à operação interna do clube). Mostra só a distribuição
 * dos quartos com o número do apartamento que o hotel confirmou. Tipografia maior e mais espaçada
 * que a versão interna (lib/pdf/rooming-list-document.tsx) — como tem só duas colunas, sobra espaço
 * pra deixar mais legível pra quem só vai bater o olho rápido.
 */

const styles = StyleSheet.create({
  hotelBox: {
    marginTop: 4,
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
  },
  hotelLinha: { fontSize: 10.5, color: "#404040", marginBottom: 3 },
  hotelLabel: { fontWeight: 700, color: CORES.grenaEscuro },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  tabela: {
    borderWidth: 0.5,
    borderColor: "#c7c7c7",
    borderRadius: 4,
    overflow: "hidden",
  },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: CORES.grenaEscuro,
  },
  headerCell: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  colApartamento: { width: 100, borderRightWidth: 0.5, borderRightColor: "#c7c7c7" },
  colNome: { flex: 1 },
  grupoQuarto: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#c7c7c7",
  },
  grupoPar: { backgroundColor: "#ffffff" },
  grupoImpar: { backgroundColor: "#f7f2f5" },
  colApartamentoCorpo: {
    width: 100,
    borderRightWidth: 0.5,
    borderRightColor: "#c7c7c7",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  aptoTexto: { fontSize: 13, fontWeight: 700, color: CORES.grena },
  colNomesCorpo: { flex: 1, paddingVertical: 5 },
  nomeLinha: {
    fontSize: 11,
    color: "#262626",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  emptyState: { fontSize: 9.5, color: "#a3a3a3", paddingVertical: 8, paddingHorizontal: 10 },
});

export interface RoomingListEnvioOcupante {
  nome: string;
  tipo: PessoaTipoRooming;
}

export interface RoomingListEnvioQuarto {
  numero: number;
  numeroApartamento: string | null;
  ocupantes: RoomingListEnvioOcupante[];
}

function TabelaQuartos({
  titulo,
  quartos,
  mensagemVazia,
}: {
  titulo: string;
  quartos: RoomingListEnvioQuarto[];
  mensagemVazia: string;
}) {
  return (
    <View wrap={false}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      {quartos.length === 0 ? (
        <Text style={styles.emptyState}>{mensagemVazia}</Text>
      ) : (
        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={[styles.colApartamento, styles.headerCell]}>Apartamento</Text>
            <Text style={[styles.colNome, styles.headerCell]}>Nome</Text>
          </View>

          {quartos.map((q, i) => (
            <View
              key={q.numero}
              style={[styles.grupoQuarto, i % 2 === 0 ? styles.grupoPar : styles.grupoImpar]}
              wrap={false}
            >
              <View style={styles.colApartamentoCorpo}>
                <Text style={styles.aptoTexto}>{q.numeroApartamento || "—"}</Text>
              </View>
              <View style={styles.colNomesCorpo}>
                {q.ocupantes.map((o, j) => (
                  <Text key={j} style={styles.nomeLinha}>
                    {o.nome}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function RoomingListEnvioDocument({
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
  quartos: RoomingListEnvioQuarto[];
}) {
  const quartosAtletas = quartos
    .map((q) => ({ ...q, ocupantes: q.ocupantes.filter((o) => o.tipo === "atleta") }))
    .filter((q) => q.ocupantes.length > 0);

  const quartosComissao = quartos
    .map((q) => ({ ...q, ocupantes: q.ocupantes.filter((o) => o.tipo !== "atleta") }))
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
          <Text style={styles.emptyState}>Nenhum quarto registrado.</Text>
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
