import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";

/**
 * Cabeçalho compartilhado pelos documentos de Logística de Jogo (Rooming List, Ônibus,
 * Credenciamento) — segue a mesma regra de posicionamento de escudos do Presskit (ver
 * docs/superpowers/specs/2026-07-09-convocacao-presskit-logistica-design.md): jogo em casa, escudo
 * do Juventus primeiro (esquerda); jogo fora, depois do escudo do mandante (direita).
 */

export const CORES = { grena: "#5C0A35", grenaEscuro: "#3F0724", dourado: "#C9A227" };

export const sharedStyles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 10, color: "#262626" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  matchupCol: { alignItems: "center", width: 110 },
  escudo: { width: 40, height: 40, objectFit: "contain" },
  vs: { fontSize: 14, fontWeight: 700, color: "#a3a3a3", marginHorizontal: 12 },
  timeNome: { fontSize: 10, fontWeight: 700, color: CORES.grenaEscuro, textAlign: "center", marginTop: 2 },
  faixaTitulo: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dadosJogo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 16 },
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
  headerCell: { fontSize: 7.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  emptyState: { fontSize: 9, color: "#a3a3a3", paddingVertical: 10, textAlign: "center" },
});

export function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export type LogoSrc = string | { data: Buffer; format: "png" | "jpg" } | null;

export function DocumentoHeader({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  titulo,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  titulo: string;
}) {
  const ladoEsquerdo = jogo.mandante
    ? { logo: juventusLogoSrc, nome: "Juventus" }
    : { logo: adversarioLogoSrc, nome: jogo.adversario_nome };
  const ladoDireito = jogo.mandante
    ? { logo: adversarioLogoSrc, nome: jogo.adversario_nome }
    : { logo: juventusLogoSrc, nome: "Juventus" };
  const horario = jogo.horario ? jogo.horario.slice(0, 5) : null;

  return (
    <>
      <View style={sharedStyles.headerRow}>
        <View style={sharedStyles.matchupCol}>
          {ladoEsquerdo.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={sharedStyles.escudo} src={ladoEsquerdo.logo as string} />
          ) : null}
          <Text style={sharedStyles.timeNome}>{ladoEsquerdo.nome}</Text>
        </View>
        <Text style={sharedStyles.vs}>×</Text>
        <View style={sharedStyles.matchupCol}>
          {ladoDireito.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={sharedStyles.escudo} src={ladoDireito.logo as string} />
          ) : null}
          <Text style={sharedStyles.timeNome}>{ladoDireito.nome}</Text>
        </View>
      </View>

      <Text style={sharedStyles.faixaTitulo}>{titulo}</Text>
      <Text style={sharedStyles.dadosJogo}>
        {jogo.competicao}
        {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""} · {formatDataBr(jogo.data_jogo)}
        {horario ? ` · ${horario}` : ""}
        {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
      </Text>
    </>
  );
}
