import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { Font, Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CORES_POSTER, HASHTAG_RODAPE } from "@/lib/posters/estilo";

// Mesma correção de hifenização do restante dos PDFs (ver lib/pdf/logistica-shared.tsx) — sem
// isso, o react-pdf quebra palavra em português em lugar errado.
Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Anton",
  src: path.join(process.cwd(), "public/fonts/anton.ttf"),
});

const juventusEscudoSrc = {
  data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo-mark.png")),
  format: "png" as const,
};

export type LogoSrc = string | { data: Buffer; format: "png" | "jpg" } | null;

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    color: CORES_POSTER.preto,
    backgroundColor: CORES_POSTER.branco,
  },
  barraTopoGrossa: {
    backgroundColor: CORES_POSTER.grena,
    paddingVertical: 10,
    alignItems: "center",
  },
  estrelas: { flexDirection: "row", gap: 6 },
  estrela: { fontSize: 12 },
  barraTopoFina: { backgroundColor: CORES_POSTER.grena, height: 6 },
  corpo: { padding: 26, paddingTop: 14, paddingBottom: 72 },
  rodapeFixo: { position: "absolute", bottom: 0, left: 0, right: 0 },
  escudosLinha: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 14 },
  escudo: { width: 50, height: 50, objectFit: "contain" },
  competicaoTexto: {
    fontFamily: "Anton",
    fontSize: 19,
    color: "#1C2C6B",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  tituloCaixa: {
    backgroundColor: CORES_POSTER.grena,
    marginTop: 10,
    paddingVertical: 11,
  },
  tituloTexto: {
    fontFamily: "Anton",
    fontSize: 36,
    color: CORES_POSTER.branco,
    textAlign: "center",
    letterSpacing: 1,
  },
  confrontoTexto: {
    fontSize: 15,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 8,
    textTransform: "uppercase",
    textDecoration: "underline",
  },
  dadosJogoTexto: {
    fontSize: 10,
    fontWeight: 700,
    color: CORES_POSTER.grena,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  rodapeHashtag: {
    fontFamily: "Anton",
    fontSize: 13,
    color: CORES_POSTER.grena,
    textAlign: "center",
    marginTop: 14,
  },
  faixaDado: {
    backgroundColor: CORES_POSTER.grena,
    marginTop: 10,
    paddingVertical: 7,
  },
  faixaDadoTexto: {
    fontFamily: "Anton",
    fontSize: 17,
    color: CORES_POSTER.branco,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  orientacoesTitulo: {
    fontSize: 12,
    fontWeight: 700,
    color: CORES_POSTER.preto,
    marginTop: 18,
    marginBottom: 8,
  },
  orientacoesLinha: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  orientacoesMarcador: {
    fontSize: 10,
    fontWeight: 700,
    color: CORES_POSTER.preto,
  },
  orientacoesTexto: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    color: CORES_POSTER.preto,
  },
  linhaProgramacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  linhaHorarioCaixa: {
    backgroundColor: CORES_POSTER.grena,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 68,
  },
  linhaHorarioTexto: {
    fontFamily: "Anton",
    fontSize: 12,
    color: CORES_POSTER.branco,
    textAlign: "center",
  },
  linhaAtividadeTexto: {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    color: CORES_POSTER.grena,
    textAlign: "center",
    textTransform: "uppercase",
  },
  linhaLocalTexto: {
    width: 100,
    fontSize: 12,
    fontWeight: 700,
    color: CORES_POSTER.grena,
    textAlign: "center",
    textTransform: "uppercase",
  },
  liberacaoTexto: {
    fontSize: 13,
    fontWeight: 700,
    color: CORES_POSTER.preto,
    marginTop: 18,
    textTransform: "uppercase",
  },
});

/**
 * Cabeçalho compartilhado pelos 3 pôsteres: as duas faixas vinho do topo, os escudos (Juventus +
 * adversário, na ordem de mandante — mesma regra do Presskit) e o nome da competição. O nome da
 * competição ainda é texto puro (sem logo próprio) — cadastro de Competições com foto fica pra uma
 * rodada futura combinada com o Mateus.
 */
export function PosterCabecalho({
  competicao,
  mandante,
  adversarioLogoSrc,
  mostrarCompeticao = true,
}: {
  competicao: string;
  mandante: boolean;
  adversarioLogoSrc: LogoSrc;
  /** Concentração e Dia de Jogo não mostram o nome da competição no cabeçalho (ver referência). */
  mostrarCompeticao?: boolean;
}) {
  const primeiro = mandante ? juventusEscudoSrc : (adversarioLogoSrc as any);
  const segundo = mandante ? (adversarioLogoSrc as any) : juventusEscudoSrc;

  return (
    <>
      <View style={styles.barraTopoGrossa}>
        <View style={styles.estrelas}>
          <Text style={[styles.estrela, { color: CORES_POSTER.prata }]}>★</Text>
          <Text style={[styles.estrela, { color: CORES_POSTER.dourado }]}>★</Text>
        </View>
      </View>
      <View style={styles.barraTopoFina} />

      <View style={{ paddingTop: 12 }}>
        <View style={styles.escudosLinha}>
          {primeiro ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.escudo} src={primeiro} />
          ) : (
            <View style={styles.escudo} />
          )}
          {segundo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.escudo} src={segundo} />
          ) : (
            <View style={styles.escudo} />
          )}
        </View>
        {mostrarCompeticao ? (
          <Text style={styles.competicaoTexto}>{competicao.toUpperCase()}</Text>
        ) : null}
      </View>
    </>
  );
}

export function PosterTitulo({ texto }: { texto: string }) {
  return (
    <View style={styles.tituloCaixa}>
      <Text style={styles.tituloTexto}>{texto}</Text>
    </View>
  );
}

export function PosterConfronto({ texto }: { texto: string }) {
  return <Text style={styles.confrontoTexto}>{texto}</Text>;
}

export function PosterDadosJogo({ texto }: { texto: string }) {
  return <Text style={styles.dadosJogoTexto}>{texto}</Text>;
}

/** Faixa vinho com a data/dia da semana — usada por Concentração e Dia de Jogo (não pelo Relacionados). */
export function PosterFaixaData({ texto }: { texto: string }) {
  return (
    <View style={styles.faixaDado}>
      <Text style={styles.faixaDadoTexto}>{texto}</Text>
    </View>
  );
}

/** Lista de regras em bullets, preto e em negrito — só a seção Concentração usa. */
export function PosterOrientacoes({ titulo, regras }: { titulo: string; regras: string[] }) {
  return (
    <View>
      <Text style={styles.orientacoesTitulo}>{titulo}</Text>
      {regras.map((regra, i) => (
        <View style={styles.orientacoesLinha} key={i}>
          <Text style={styles.orientacoesMarcador}>•</Text>
          <Text style={styles.orientacoesTexto}>{regra}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Uma linha de cronograma (horário em caixa vinho + atividade + local) — usada por Concentração e
 * Dia de Jogo. `alignItems: "center"` no container faz o horário/local ficarem centralizados
 * verticalmente mesmo quando a atividade quebra em duas linhas (ex: "JUVENTUS X FERROVIÁRIA").
 */
export function PosterLinhaProgramacao({
  horario,
  atividade,
  local,
}: {
  horario: string;
  atividade: string;
  local: string;
}) {
  return (
    <View style={styles.linhaProgramacao}>
      <View style={styles.linhaHorarioCaixa}>
        <Text style={styles.linhaHorarioTexto}>{horario}</Text>
      </View>
      <Text style={styles.linhaAtividadeTexto}>{atividade}</Text>
      <Text style={styles.linhaLocalTexto}>{local}</Text>
    </View>
  );
}

/** Frase final livre do pôster Dia de Jogo (ex: "Atletas liberados após o almoço!"). */
export function PosterLiberacao({ texto }: { texto: string }) {
  return <Text style={styles.liberacaoTexto}>{texto}</Text>;
}

export function PosterRodape() {
  return (
    <View style={styles.rodapeFixo}>
      <Text style={styles.rodapeHashtag}>{HASHTAG_RODAPE}</Text>
      <View style={{ height: 14 }} />
      <View style={styles.barraTopoFina} />
      <View style={styles.barraTopoGrossa} />
    </View>
  );
}
