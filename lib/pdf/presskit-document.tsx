import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { AtletaRow, JogoRow } from "@/lib/supabase/types";

const CORES = { grena: "#5C0A35", grenaEscuro: "#3F0724", dourado: "#C9A227" };

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 10, color: "#262626" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  matchupCol: { alignItems: "center", width: 130 },
  escudo: { width: 56, height: 56, objectFit: "contain" },
  vs: { fontSize: 18, fontWeight: 700, color: "#a3a3a3", marginHorizontal: 16 },
  timeNome: { fontSize: 13, fontWeight: 700, color: CORES.grenaEscuro, textAlign: "center", marginTop: 4 },
  faixaTitulo: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dadosJogo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 18 },
  sectionTitulo: {
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
  table: { marginTop: 2 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#f5f5f5",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  colNumero: { width: 28, textAlign: "center", fontWeight: 700 },
  colNome: { flex: 1, flexDirection: "row", alignItems: "center" },
  colData: { width: 66 },
  colPosicao: { width: 66 },
  colNatural: { width: 110 },
  headerCell: { fontSize: 7.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  capitaoFaixa: {
    backgroundColor: CORES.dourado,
    color: CORES.grenaEscuro,
    fontSize: 6.5,
    fontWeight: 700,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginLeft: 5,
  },
  emptyState: { fontSize: 9, color: "#a3a3a3", paddingVertical: 10, textAlign: "center" },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#d4d4d4", paddingTop: 10 },
  footerTitulo: {
    fontSize: 8.5,
    fontWeight: 700,
    color: CORES.grena,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerNomes: { fontSize: 9, color: "#404040", lineHeight: 1.5 },
});

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

type LogoSrc = string | { data: Buffer; format: "png" | "jpg" } | null;

function AtletaTable({
  titulo,
  atletas,
  capitaoId,
}: {
  titulo: string;
  atletas: AtletaRow[];
  capitaoId: string | null;
}) {
  return (
    <>
      <Text style={styles.sectionTitulo}>{titulo}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colNumero, styles.headerCell]}>Nº</Text>
          <Text style={[styles.colNome, styles.headerCell]}>Nome</Text>
          <Text style={[styles.colData, styles.headerCell]}>Nascimento</Text>
          <Text style={[styles.colPosicao, styles.headerCell]}>Posição</Text>
          <Text style={[styles.colNatural, styles.headerCell]}>Naturalidade</Text>
        </View>
        {atletas.length === 0 ? (
          <Text style={styles.emptyState}>Nenhum atleta nesta lista.</Text>
        ) : (
          atletas.map((a) => (
            <View style={styles.tableRow} key={a.id} wrap={false}>
              <Text style={styles.colNumero}>{a.numero_camisa ?? "—"}</Text>
              <View style={styles.colNome}>
                <Text>{a.nome_completo}</Text>
                {a.id === capitaoId ? <Text style={styles.capitaoFaixa}>C</Text> : null}
              </View>
              <Text style={styles.colData}>{formatDataBr(a.data_nascimento)}</Text>
              <Text style={styles.colPosicao}>{a.posicao}</Text>
              <Text style={styles.colNatural}>
                {[a.cidade_natal, a.uf_natal].filter(Boolean).join("/") || "—"}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );
}

export function PresskitDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  titulares,
  reservas,
  capitaoId,
  comissaoNomes,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  titulares: AtletaRow[];
  reservas: AtletaRow[];
  capitaoId: string | null;
  comissaoNomes: string[];
}) {
  // Regra: jogo em casa, Juventus primeiro (esquerda); jogo fora, Juventus depois do mandante (direita).
  const ladoEsquerdo = jogo.mandante
    ? { logo: juventusLogoSrc, nome: "Juventus" }
    : { logo: adversarioLogoSrc, nome: jogo.adversario_nome };
  const ladoDireito = jogo.mandante
    ? { logo: adversarioLogoSrc, nome: jogo.adversario_nome }
    : { logo: juventusLogoSrc, nome: "Juventus" };

  const horario = jogo.horario ? jogo.horario.slice(0, 5) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.matchupCol}>
            {ladoEsquerdo.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.escudo} src={ladoEsquerdo.logo as any} />
            ) : null}
            <Text style={styles.timeNome}>{ladoEsquerdo.nome}</Text>
          </View>
          <Text style={styles.vs}>×</Text>
          <View style={styles.matchupCol}>
            {ladoDireito.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.escudo} src={ladoDireito.logo as any} />
            ) : null}
            <Text style={styles.timeNome}>{ladoDireito.nome}</Text>
          </View>
        </View>

        <Text style={styles.faixaTitulo}>Relação de Atletas Relacionados</Text>
        <Text style={styles.dadosJogo}>
          {jogo.competicao}
          {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""} · {formatDataBr(jogo.data_jogo)}
          {horario ? ` · ${horario}` : ""}
          {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
        </Text>

        <AtletaTable titulo="Titulares" atletas={titulares} capitaoId={capitaoId} />
        <AtletaTable titulo="Reservas" atletas={reservas} capitaoId={capitaoId} />

        <View style={styles.footer}>
          <Text style={styles.footerTitulo}>Comissão Técnica / Diretoria</Text>
          <Text style={styles.footerNomes}>
            {comissaoNomes.length > 0 ? comissaoNomes.join("  ·  ") : "—"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
