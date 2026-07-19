import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { Font, Image, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
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
    fontSize: 42,
    color: CORES_POSTER.branco,
    textAlign: "center",
    letterSpacing: 1,
  },
  confrontoTexto: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    textTransform: "uppercase",
    textDecoration: "underline",
  },
  dadosJogoTexto: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
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
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: CORES_POSTER.preto,
    marginTop: 18,
    marginBottom: 9,
    letterSpacing: 0.3,
  },
  orientacoesLinha: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 7,
  },
  orientacoesMarcador: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: CORES_POSTER.preto,
  },
  orientacoesTexto: {
    fontFamily: "Helvetica-Bold",
    flex: 1,
    fontSize: 12,
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
    paddingVertical: 7,
    paddingHorizontal: 8,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  linhaHorarioTexto: {
    fontFamily: "Anton",
    fontSize: 16,
    color: CORES_POSTER.branco,
    textAlign: "center",
  },
  linhaAtividadeTexto: {
    fontFamily: "Helvetica-Bold",
    flex: 1,
    fontSize: 14,
    color: CORES_POSTER.grena,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  linhaLocalTexto: {
    fontFamily: "Helvetica-Bold",
    width: 105,
    fontSize: 14,
    color: CORES_POSTER.grena,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  liberacaoTexto: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: CORES_POSTER.preto,
    marginTop: 18,
    textTransform: "uppercase",
  },
  // Moldura lateral (barra dupla vinho na borda esquerda, altura total da página) — usada por
  // Concentração e Dia de Jogo em vez das faixas horizontais do topo/rodapé do Relacionados.
  // Medidas tiradas por análise de pixel da referência do Mateus (largura A4 = 595.28pt):
  // barra grossa 0–8.63%, vão em branco 8.63–9.89%, barra fina 9.89–11.97%.
  molduraLateralGrossa: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 51.4,
    backgroundColor: CORES_POSTER.grena,
  },
  molduraLateralFina: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 58.9,
    width: 11.6,
    backgroundColor: CORES_POSTER.grena,
  },
  // Mesma proporção de margem (~16%) usada pela caixa de título na referência — bem maior que o
  // `corpo` do Relacionados porque aqui o conteúdo precisa ficar nitidamente à direita da moldura.
  corpoLateral: {
    paddingTop: 20,
    paddingLeft: 98,
    paddingRight: 96,
    paddingBottom: 50,
  },
  cabecalhoLateralEstrelas: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
  },
  cabecalhoLateralEscudos: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
  },
  rodapeLateralHashtag: {
    fontFamily: "Anton",
    fontSize: 13,
    color: CORES_POSTER.grena,
    textAlign: "center",
    paddingBottom: 20,
  },
});

// Estrela desenhada em SVG (em vez do caractere "★") — as fontes padrão do react-pdf (Helvetica)
// não têm esse glifo Unicode, então o <Text>★</Text> simplesmente não desenhava nada (mesmo bug
// já corrigido na versão em imagem/Satori, ver `lib/posters/poster-imagem-shared.tsx`).
function Estrela({ cor, tamanho = 12 }: { cor: string; tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      <Path
        fill={cor}
        d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.27l-6.18 3.24L7 13.63l-5-4.87 6.91-1L12 1.5z"
      />
    </Svg>
  );
}

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
          <Estrela cor={CORES_POSTER.prata} />
          <Estrela cor={CORES_POSTER.dourado} />
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

/**
 * Moldura lateral (duas barras vinho na borda esquerda, altura total da página) — usada por
 * Concentração e Dia de Jogo em vez das faixas horizontais do topo/rodapé do Relacionados. Deve
 * ser o primeiro elemento dentro do `<Page>` (posicionamento absoluto é relativo à página).
 */
export function PosterMolduraLateral() {
  return (
    <>
      <View style={styles.molduraLateralGrossa} />
      <View style={styles.molduraLateralFina} />
    </>
  );
}

/**
 * Cabeçalho de Concentração/Dia de Jogo: estrelas e escudos direto no fundo branco, sem as faixas
 * vinho do Relacionados (a referência do Mateus não tem essas faixas nesses dois pôsteres — só a
 * moldura lateral). Também não mostra nome de competição (mesma regra do `PosterCabecalho`).
 */
export function PosterCabecalhoLateral({
  mandante,
  adversarioLogoSrc,
}: {
  mandante: boolean;
  adversarioLogoSrc: LogoSrc;
}) {
  const primeiro = mandante ? juventusEscudoSrc : (adversarioLogoSrc as any);
  const segundo = mandante ? (adversarioLogoSrc as any) : juventusEscudoSrc;

  return (
    <>
      <View style={styles.cabecalhoLateralEstrelas}>
        <View style={styles.estrelas}>
          <Estrela cor={CORES_POSTER.prata} />
          <Estrela cor={CORES_POSTER.dourado} />
        </View>
      </View>
      <View style={styles.cabecalhoLateralEscudos}>
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
      </View>
    </>
  );
}

/** Rodapé de Concentração/Dia de Jogo: só a hashtag, sem as faixas vinho do Relacionados. */
export function PosterRodapeLateral() {
  return (
    <View style={styles.rodapeFixo}>
      <Text style={styles.rodapeLateralHashtag}>{HASHTAG_RODAPE}</Text>
    </View>
  );
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
