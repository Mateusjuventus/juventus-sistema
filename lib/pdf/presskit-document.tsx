import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AtletaRow, JogoRow } from "@/lib/supabase/types";
import { DocumentoFooter } from "./logistica-shared";

const CORES = { grena: "#5C0A35", grenaEscuro: "#3F0724", dourado: "#C9A227" };

// Fonte cursiva usada pra destacar o número da camisa no cartão de cada jogador (arquivo enviado
// pelo Mateus — "Amsterdam Signature Duo"). Registrada uma única vez, no carregamento do módulo.
Font.register({
  family: "AmsterdamSignatureDuo",
  src: path.join(process.cwd(), "public/fonts/amsterdam-signature-duo.ttf"),
});

// Marca d'água do escudo, usada como fundo decorativo (bem clara) na página do presskit, pra dar
// um pouco mais de identidade visual do clube ao documento.
const escudoWatermarkSrc = {
  data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo.png")),
  format: "png" as const,
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 34,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#262626",
    backgroundColor: "#ffffff",
  },
  topoDourado: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: CORES.dourado },
  // Moldura fina ao redor da página inteira — dá um acabamento de documento oficial.
  molduraExterna: {
    position: "absolute",
    top: 13,
    left: 13,
    right: 13,
    bottom: 13,
    borderWidth: 0.75,
    borderColor: CORES.grena,
    opacity: 0.5,
  },
  molduraInterna: {
    position: "absolute",
    top: 16.5,
    left: 16.5,
    right: 16.5,
    bottom: 16.5,
    borderWidth: 0.4,
    borderColor: CORES.dourado,
    opacity: 0.55,
  },
  watermark: {
    position: "absolute",
    top: 246,
    left: 122,
    width: 350,
    height: 350,
    opacity: 0.05,
  },
  // Cabeçalho direto sobre o fundo branco da página — escudos + texto, separado da relação de
  // atletas por um fio dourado. Layout em 3 colunas simétricas (escudos | texto | espaço vazio do
  // mesmo tamanho) garante que o bloco de texto fique sempre centralizado na página, independente
  // da largura dos escudos.
  headerBanda: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: CORES.dourado,
  },
  headerColuna: { width: 100, flexDirection: "row", alignItems: "center" },
  // Os dois escudos (Juventus e adversário) ficam juntos, lado a lado, sempre respeitando a regra
  // de mandante: Juventus primeiro (esquerda do par) quando joga em casa, depois do adversário
  // (direita do par) quando joga fora.
  escudoCompacto: {
    width: 42,
    height: 42,
    objectFit: "contain",
  },
  escudoParSegundo: { marginLeft: 8 },
  headerTextos: { flex: 1, alignItems: "center" },
  headerTitulo: {
    fontSize: 20,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  headerConfronto: {
    fontSize: 11,
    fontWeight: 700,
    color: CORES.grena,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: "center",
  },
  headerDados: {
    fontSize: 8.3,
    fontWeight: 700,
    color: "#4d4d4d",
    marginTop: 2,
    textAlign: "center",
  },
  colunas: { flexDirection: "row", gap: 20, marginTop: 18 },
  coluna: { flex: 1 },
  colunaTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    paddingBottom: 4,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    borderBottomWidth: 1.4,
    borderBottomColor: CORES.grena,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee2e7",
  },
  linhaAlternada: { backgroundColor: "#FAF6F8" },
  numero: {
    fontFamily: "AmsterdamSignatureDuo",
    fontSize: 27,
    lineHeight: 1,
    color: CORES.grena,
    width: 26,
    textAlign: "center",
    marginRight: 5,
  },
  foto: { width: 28, height: 37, objectFit: "cover", borderRadius: 2, marginRight: 6 },
  fotoPlaceholder: {
    width: 28,
    height: 37,
    borderRadius: 2,
    marginRight: 6,
    backgroundColor: "#f0ebee",
    alignItems: "center",
    justifyContent: "center",
  },
  fotoPlaceholderLetra: { fontSize: 12.5, fontWeight: 700, color: CORES.grena },
  infoBloco: { flex: 1 },
  nomeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  nome: { fontSize: 10.5, fontWeight: 700, color: "#141414", textTransform: "uppercase" },
  detalhes: {
    fontSize: 8,
    color: "#5c5c5c",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  capitaoFaixa: {
    backgroundColor: CORES.dourado,
    color: CORES.grenaEscuro,
    fontSize: 6.5,
    fontWeight: 700,
    paddingHorizontal: 3.5,
    paddingVertical: 2,
    borderRadius: 2,
    marginLeft: 4,
  },
  emptyState: { fontSize: 9, color: "#a3a3a3", paddingVertical: 10, textAlign: "center" },
  footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: CORES.dourado, paddingTop: 10 },
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

export interface AtletaPresskitItem {
  atleta: AtletaRow;
  fotoSrc: LogoSrc;
}

function AtletaLinha({
  item,
  capitaoId,
  par,
}: {
  item: AtletaPresskitItem;
  capitaoId: string | null;
  par: boolean;
}) {
  const { atleta, fotoSrc } = item;
  return (
    <View style={par ? [styles.linha, styles.linhaAlternada] : styles.linha} wrap={false}>
      <Text style={styles.numero}>{atleta.numero_camisa ?? "—"}</Text>
      {fotoSrc ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={styles.foto} src={fotoSrc as any} />
      ) : (
        <View style={styles.fotoPlaceholder}>
          <Text style={styles.fotoPlaceholderLetra}>{atleta.nome_completo.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.infoBloco}>
        <View style={styles.nomeRow}>
          <Text style={styles.nome}>{atleta.nome_completo}</Text>
          {atleta.id === capitaoId ? <Text style={styles.capitaoFaixa}>C</Text> : null}
        </View>
        <Text style={styles.detalhes}>
          {atleta.posicao} · {formatDataBr(atleta.data_nascimento)} ·{" "}
          {[atleta.cidade_natal, atleta.uf_natal].filter(Boolean).join("/") || "—"}
        </Text>
      </View>
    </View>
  );
}

function ColunaAtletas({
  titulo,
  itens,
  capitaoId,
}: {
  titulo: string;
  itens: AtletaPresskitItem[];
  capitaoId: string | null;
}) {
  return (
    <View style={styles.coluna}>
      <Text style={styles.colunaTitulo}>{titulo}</Text>
      {itens.length === 0 ? (
        <Text style={styles.emptyState}>Nenhum atleta nesta lista.</Text>
      ) : (
        itens.map((item, i) => (
          <AtletaLinha item={item} capitaoId={capitaoId} par={i % 2 === 1} key={item.atleta.id} />
        ))
      )}
    </View>
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
  titulares: AtletaPresskitItem[];
  reservas: AtletaPresskitItem[];
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
        <View style={styles.topoDourado} fixed />
        <View style={styles.molduraExterna} fixed />
        <View style={styles.molduraInterna} fixed />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.watermark} src={escudoWatermarkSrc} fixed />

        <View style={styles.headerBanda}>
          <View style={styles.headerColuna}>
            {ladoEsquerdo.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.escudoCompacto} src={ladoEsquerdo.logo as any} />
            ) : null}
            {ladoDireito.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={[styles.escudoCompacto, styles.escudoParSegundo]} src={ladoDireito.logo as any} />
            ) : null}
          </View>
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>Escalação</Text>
            <Text style={styles.headerConfronto}>
              {ladoEsquerdo.nome} × {ladoDireito.nome}
            </Text>
            <Text style={styles.headerDados}>
              {jogo.competicao}
              {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""} · {formatDataBr(jogo.data_jogo)}
              {horario ? ` · ${horario}` : ""}
              {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
            </Text>
          </View>
          {/* Coluna vazia do mesmo tamanho da coluna dos escudos, só pra manter o texto do meio
              sempre centralizado na página. */}
          <View style={styles.headerColuna} />
        </View>

        <View style={styles.colunas}>
          <ColunaAtletas titulo="Titulares" itens={titulares} capitaoId={capitaoId} />
          <ColunaAtletas titulo="Reservas" itens={reservas} capitaoId={capitaoId} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitulo}>Comissão Técnica / Diretoria</Text>
          <Text style={styles.footerNomes}>
            {comissaoNomes.length > 0 ? comissaoNomes.join("  ·  ") : "—"}
          </Text>
        </View>

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
