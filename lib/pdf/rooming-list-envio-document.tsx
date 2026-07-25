import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow, PessoaTipoRooming } from "@/lib/supabase/types";
import {
  CORES,
  DocumentoFooter,
  DocumentoHeader,
  formatDataBr,
  ordenarQuartosPorApartamento,
  sharedStyles,
  type LogoSrc,
  type OrdemApartamento,
} from "./logistica-shared";

/**
 * Versão da Rooming List para ENVIAR aos atletas e comissão técnica — sem nenhum dado pessoal
 * (sem Nascimento/CPF/RG, que só interessam à operação interna do clube). Mostra só a distribuição
 * dos quartos com o número do apartamento que o hotel confirmou. Atletas e Comissão Técnica ficam
 * lado a lado (duas colunas) pra caber tudo numa página só, junto com as informações do jogo — com
 * elenco grande numa coluna só (formato anterior) a lista de atletas sozinha já passava de uma
 * página e a Comissão Técnica acabava indo pra página 2.
 */

const styles = StyleSheet.create({
  hotelBox: {
    marginTop: 4,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
  },
  hotelLinha: { fontSize: 9.5, color: "#404040", marginBottom: 2 },
  hotelLabel: { fontWeight: 700, color: CORES.grenaEscuro },
  colunas: { flexDirection: "row" },
  coluna: { flex: 1 },
  colunaEsquerda: { marginRight: 14 },
  secaoTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    marginBottom: 5,
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
    fontSize: 7.5,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colApartamento: { width: 56, borderRightWidth: 0.5, borderRightColor: "#c7c7c7" },
  colNome: { flex: 1 },
  grupoQuarto: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#c7c7c7",
  },
  grupoPar: { backgroundColor: "#ffffff" },
  grupoImpar: { backgroundColor: "#f7f2f5" },
  colApartamentoCorpo: {
    width: 56,
    borderRightWidth: 0.5,
    borderRightColor: "#c7c7c7",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  aptoTexto: { fontSize: 10.5, fontWeight: 700, color: CORES.grena },
  colNomesCorpo: { flex: 1, paddingVertical: 3 },
  nomeLinha: {
    fontSize: 9,
    color: "#262626",
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  emptyState: { fontSize: 8.5, color: "#a3a3a3", paddingVertical: 6, paddingHorizontal: 8 },
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
    <View>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      {quartos.length === 0 ? (
        <Text style={styles.emptyState}>{mensagemVazia}</Text>
      ) : (
        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={[styles.colApartamento, styles.headerCell]}>Apto</Text>
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
  ordemAtletas,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  hotelNome: string | null;
  hotelEndereco: string | null;
  checkin: string | null;
  checkout: string | null;
  quartos: RoomingListEnvioQuarto[];
  /** Ordena a tabela de Atletas pelo número do apartamento (ver `ordenarQuartosPorApartamento`).
   * Comissão Técnica nunca é afetada — fica sempre na ordem livre de cadastro. */
  ordemAtletas?: OrdemApartamento;
}) {
  const quartosAtletas = ordenarQuartosPorApartamento(
    quartos
      .map((q) => ({ ...q, ocupantes: q.ocupantes.filter((o) => o.tipo === "atleta") }))
      .filter((q) => q.ocupantes.length > 0),
    ordemAtletas,
  );

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
          <View style={styles.colunas}>
            <View style={[styles.coluna, styles.colunaEsquerda]}>
              <TabelaQuartos
                titulo="Atletas"
                quartos={quartosAtletas}
                mensagemVazia="Nenhum atleta com quarto atribuído."
              />
            </View>
            <View style={styles.coluna}>
              <TabelaQuartos
                titulo="Comissão Técnica"
                quartos={quartosComissao}
                mensagemVazia="Nenhum integrante da comissão técnica com quarto atribuído."
              />
            </View>
          </View>
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
