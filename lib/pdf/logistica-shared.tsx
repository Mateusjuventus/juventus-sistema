import { Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";

/**
 * Cabeçalho compartilhado pelos documentos de Logística de Jogo (Rooming List, Ônibus,
 * Credenciamento) — segue a mesma regra de posicionamento de escudos do Presskit (ver
 * docs/superpowers/specs/2026-07-09-convocacao-presskit-logistica-design.md): jogo em casa, escudo
 * do Juventus primeiro (esquerda); jogo fora, depois do escudo do mandante (direita).
 */

// O react-pdf hifeniza texto justificado por padrão usando regras em inglês, o que quebra palavras
// em português em lugares errados (ex: "real-izado"). Desativamos globalmente — a palavra inteira
// pula de linha em vez de ser cortada.
Font.registerHyphenationCallback((word) => [word]);

export const CORES = { grena: "#5C0A35", grenaEscuro: "#3F0724", dourado: "#C9A227" };

/** Identidade oficial do clube, usada no rodapé de todo documento e no texto do recibo. */
export const JUVENTUS_RAZAO_SOCIAL = "Juventus Sociedade Anônima do Futebol";
export const JUVENTUS_CNPJ = "63.634.319/0001-99";
export const JUVENTUS_ENDERECO = "Rua Javari, 117 – Mooca, São Paulo – SP, 03112-100";

export const sharedStyles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 60, fontFamily: "Helvetica", fontSize: 10, color: "#262626" },
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
  footer: {
    position: "absolute",
    bottom: 22,
    left: 32,
    right: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#d4d4d4",
    paddingTop: 6,
  },
  footerTexto: { fontSize: 7, color: "#a3a3a3", textAlign: "center" },
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

/**
 * Rodapé com a identidade oficial do clube (razão social, CNPJ e endereço), repetido em toda
 * página — usado em todos os documentos oficiais gerados pelo sistema (presskit, rooming list,
 * ônibus, credenciamento e recibo de pagamento).
 */
export function DocumentoFooter() {
  return (
    <View style={sharedStyles.footer} fixed>
      <Text style={sharedStyles.footerTexto}>
        {JUVENTUS_RAZAO_SOCIAL} · CNPJ {JUVENTUS_CNPJ}
      </Text>
      <Text style={sharedStyles.footerTexto}>{JUVENTUS_ENDERECO}</Text>
    </View>
  );
}

/**
 * Peças usadas só nos documentos do módulo Financeiro (Orçamento Previsto e Relatório Geral da
 * Prestação de Contas) — rótulo do departamento, carimbo de geração e bloco de assinaturas. Não
 * fazem parte do DocumentoHeader/DocumentoFooter compartilhado por não se aplicarem aos outros
 * documentos oficiais (rooming list, ônibus, credenciamento, recibo, presskit).
 */
export const financeiroStyles = StyleSheet.create({
  departamentoEyebrow: {
    textAlign: "center",
    fontSize: 8.5,
    fontWeight: 700,
    color: CORES.grena,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  carimbo: {
    position: "absolute",
    top: 32,
    right: 32,
    borderWidth: 0.75,
    borderColor: "#a3a3a3",
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  carimboLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  carimboValor: { fontSize: 7.5, fontWeight: 700, color: "#525252", textAlign: "center", marginTop: 1 },
  assinaturasRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 36 },
  assinaturaCol: { width: "42%", alignItems: "center" },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#737373", width: "100%", marginBottom: 6 },
  assinaturaNome: { fontSize: 9.5, fontWeight: 700, color: "#1f1f1f", textAlign: "center" },
  assinaturaCargo: { fontSize: 8, color: "#525252", textAlign: "center", marginTop: 1 },
});

export const DEPARTAMENTO_LABEL = "Departamento de Futebol Profissional";

export function formatCarimbo(geradoEm: Date): string {
  const dia = String(geradoEm.getDate()).padStart(2, "0");
  const mes = String(geradoEm.getMonth() + 1).padStart(2, "0");
  const ano = geradoEm.getFullYear();
  const hora = String(geradoEm.getHours()).padStart(2, "0");
  const minuto = String(geradoEm.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
}

/** Rótulo do departamento — aparece no topo dos documentos do Financeiro, acima dos escudos/título. */
export function DepartamentoEyebrow() {
  return <Text style={financeiroStyles.departamentoEyebrow}>{DEPARTAMENTO_LABEL}</Text>;
}

/** Carimbo com data/hora de geração do documento, no canto superior direito da página. */
export function CarimboGeracao({ geradoEm }: { geradoEm: Date }) {
  return (
    <View style={financeiroStyles.carimbo} fixed>
      <Text style={financeiroStyles.carimboLabel}>Gerado em</Text>
      <Text style={financeiroStyles.carimboValor}>{formatCarimbo(geradoEm)}</Text>
    </View>
  );
}

export interface AssinaturaInfo {
  nome: string;
  cargo: string;
}

/** Bloco com as duas assinaturas (nome + cargo) vindas de configuracoes_financeiro. */
export function AssinaturasBlock({
  assinatura1,
  assinatura2,
}: {
  assinatura1: AssinaturaInfo;
  assinatura2: AssinaturaInfo;
}) {
  return (
    <View style={financeiroStyles.assinaturasRow} wrap={false}>
      <View style={financeiroStyles.assinaturaCol}>
        <View style={financeiroStyles.assinaturaLinha} />
        <Text style={financeiroStyles.assinaturaNome}>{assinatura1.nome}</Text>
        <Text style={financeiroStyles.assinaturaCargo}>{assinatura1.cargo}</Text>
      </View>
      <View style={financeiroStyles.assinaturaCol}>
        <View style={financeiroStyles.assinaturaLinha} />
        <Text style={financeiroStyles.assinaturaNome}>{assinatura2.nome}</Text>
        <Text style={financeiroStyles.assinaturaCargo}>{assinatura2.cargo}</Text>
      </View>
    </View>
  );
}
