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
  data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo.png")),
  format: "png" as const,
};

// Marca da Proxis usada na linha discreta de crédito do rodapé (ver docs/superpowers/specs/
// 2026-10-04-rebranding-proxis-design.md) — chrome do software, não identidade do clube, por isso
// bem pequena e sem concorrer com o brasão do Juventus/adversário nem com a #MOLEQUETRAVESSO.
const proxisMarkSrc = {
  data: readFileSync(path.join(process.cwd(), "public/brand/proxis-mark.png")),
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
  barraTopoFina: { backgroundColor: CORES_POSTER.grena, height: 6 },
  corpo: { padding: 26, paddingTop: 14, paddingBottom: 72 },
  rodapeFixo: { position: "absolute", bottom: 0, left: 0, right: 0 },
  escudosLinha: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 14 },
  // Proporção 773:1008 do brasão completo (círculo + as duas estrelas acima) — largura fixa em
  // 60pt, altura calculada pra não espremer nem cortar as estrelas (ver public/brand/juventus-
  // escudo.png). Antes disso o escudo usava o recorte sem estrelas (juventus-escudo-mark.png) e as
  // estrelas eram desenhadas à parte na faixa vinho do topo — duplicado e, junto de um escudo
  // adversário que já vem com seu próprio desenho completo, parecia errado (pedido do Mateus em
  // 2026-09-30). Agora as estrelas vêm só do brasão em si.
  escudo: { width: 60, height: 78, objectFit: "contain" },
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
  // Linha discreta "Gerado via Proxis Gestão Esportiva" — ver proxisMarkSrc acima. `prata` (cinza
  // da própria paleta do pôster) em vez do grena/dourado de toda a identidade do clube: não é pra
  // chamar atenção, só uma assinatura pequena de quem gerou o documento.
  rodapeProxisLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 4,
  },
  rodapeProxisMarca: { width: 8, height: 8 },
  rodapeProxisTexto: { fontFamily: "Helvetica", fontSize: 6.5, color: CORES_POSTER.prata },
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
  cabecalhoLateralEscudos: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
  },
  rodapeLateralHashtag: {
    fontFamily: "Anton",
    fontSize: 13,
    color: CORES_POSTER.grena,
    textAlign: "center",
  },
  // Mesma linha de crédito do Relacionados (`rodapeProxisLinha`), só que com o `paddingBottom` que
  // antes vivia em `rodapeLateralHashtag` — aqui ela é o último elemento antes da borda da página,
  // já que Concentração/Dia de Jogo não têm as faixas vinho do rodapé do Relacionados embaixo.
  rodapeProxisLinhaLateral: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 4,
    paddingBottom: 14,
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
      <View style={styles.barraTopoGrossa} />
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
      <View style={styles.rodapeProxisLinhaLateral}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.rodapeProxisMarca} src={proxisMarkSrc} />
        <Text style={styles.rodapeProxisTexto}>Gerado via Proxis Gestão Esportiva</Text>
      </View>
    </View>
  );
}

export function PosterRodape() {
  return (
    <View style={styles.rodapeFixo}>
      <Text style={styles.rodapeHashtag}>{HASHTAG_RODAPE}</Text>
      <View style={styles.rodapeProxisLinha}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.rodapeProxisMarca} src={proxisMarkSrc} />
        <Text style={styles.rodapeProxisTexto}>Gerado via Proxis Gestão Esportiva</Text>
      </View>
      <View style={{ height: 10 }} />
      <View style={styles.barraTopoFina} />
      <View style={styles.barraTopoGrossa} />
    </View>
  );
}
