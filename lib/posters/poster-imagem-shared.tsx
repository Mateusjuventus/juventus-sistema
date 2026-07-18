import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import {
  CORES_POSTER,
  CORPO_LATERAL_PADDING_DIREITA,
  CORPO_LATERAL_PADDING_ESQUERDA,
  HASHTAG_RODAPE,
  POSTER_IMAGEM_LARGURA,
} from "./estilo";

/**
 * Blocos compartilhados pelos 3 pôsteres na versão IMAGEM (JPG), gerada com o `ImageResponse` do
 * Next.js (`next/og`) — ver docs/superpowers/specs/2026-07-17-posters-relacionados-programacao-
 * design.md. Usa um subconjunto de HTML/CSS (só flexbox, sem grid) diferente do
 * `lib/pdf/poster-shared.tsx` (react-pdf) — as duas tecnologias não compartilham componentes, só
 * as mesmas cores/medidas de `lib/posters/estilo.ts`.
 */

let juventusEscudoDataUri: string | null = null;
export function getJuventusEscudoDataUri(): string {
  if (!juventusEscudoDataUri) {
    const buf = readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo-mark.png"));
    juventusEscudoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  }
  return juventusEscudoDataUri;
}

export function getAntonFontBuffer(): Buffer {
  return readFileSync(path.join(process.cwd(), "public/fonts/anton.ttf"));
}

// Estrela desenhada em SVG (em vez do caractere "★") porque a fonte padrão do Satori/@vercel-og
// não tem esse glifo — aparecia como um quadradinho com "X" dentro no lugar da estrela.
function Estrela({ cor, tamanho = 22 }: { cor: string; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" style={{ display: "flex" }}>
      <path
        fill={cor}
        d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.27l-6.18 3.24L7 13.63l-5-4.87 6.91-1L12 1.5z"
      />
    </svg>
  );
}

export function PosterCabecalhoImg({
  competicao,
  mandante,
  adversarioLogoUrl,
  mostrarCompeticao = true,
}: {
  competicao: string;
  mandante: boolean;
  adversarioLogoUrl: string | null;
  /** Concentração e Dia de Jogo não mostram o nome da competição no cabeçalho (ver referência). */
  mostrarCompeticao?: boolean;
}) {
  const juventus = getJuventusEscudoDataUri();
  const primeiro = mandante ? juventus : adversarioLogoUrl;
  const segundo = mandante ? adversarioLogoUrl : juventus;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div
        style={{
          display: "flex",
          backgroundColor: CORES_POSTER.grena,
          paddingTop: 22,
          paddingBottom: 22,
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <Estrela cor={CORES_POSTER.prata} />
          <Estrela cor={CORES_POSTER.dourado} />
        </div>
      </div>
      <div style={{ display: "flex", backgroundColor: CORES_POSTER.grena, height: 10, width: "100%" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {primeiro ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primeiro} width={110} height={110} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", width: 110, height: 110 }} />
          )}
          {segundo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={segundo} width={110} height={110} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", width: 110, height: 110 }} />
          )}
        </div>
        {mostrarCompeticao ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Anton",
              fontSize: 38,
              color: "#1C2C6B",
              marginTop: 20,
              letterSpacing: 1,
            }}
          >
            {competicao.toUpperCase()}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PosterTituloImg({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: CORES_POSTER.grena,
        marginTop: 24,
        paddingTop: 22,
        paddingBottom: 22,
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 68, color: CORES_POSTER.branco }}>
        {texto}
      </div>
    </div>
  );
}

export function PosterConfrontoImg({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 30,
        fontWeight: 700,
        marginTop: 18,
        textDecoration: "underline",
        color: CORES_POSTER.preto,
      }}
    >
      {texto}
    </div>
  );
}

export function PosterDadosJogoImg({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 20,
        fontWeight: 700,
        color: CORES_POSTER.grena,
        marginTop: 12,
        marginBottom: 26,
        textAlign: "center",
      }}
    >
      {texto}
    </div>
  );
}

/** Faixa vinho com a data/dia da semana — usada por Concentração e Dia de Jogo. */
export function PosterFaixaDataImg({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: CORES_POSTER.grena,
        marginTop: 18,
        paddingTop: 14,
        paddingBottom: 14,
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 30, color: CORES_POSTER.branco }}>
        {texto}
      </div>
    </div>
  );
}

/** Lista de regras em bullets, preto e em negrito — só a seção Concentração usa. */
export function PosterOrientacoesImg({ titulo, regras }: { titulo: string; regras: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 30 }}>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: CORES_POSTER.preto, marginBottom: 14 }}>
        {titulo}
      </div>
      {regras.map((regra, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: CORES_POSTER.preto }}>•</div>
          <div style={{ display: "flex", flex: 1, fontSize: 18, fontWeight: 700, color: CORES_POSTER.preto }}>
            {regra}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Uma linha de cronograma (horário em caixa vinho + atividade + local) — usada por Concentração e
 * Dia de Jogo. `alignItems: "center"` no container faz o horário/local ficarem centralizados
 * verticalmente mesmo quando a atividade quebra em duas linhas (ex: "JUVENTUS X FERROVIÁRIA").
 */
export function PosterLinhaProgramacaoImg({
  horario,
  atividade,
  local,
}: {
  horario: string;
  atividade: string;
  local: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%", marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          backgroundColor: CORES_POSTER.grena,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 14,
          paddingRight: 14,
          minWidth: 120,
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 20, color: CORES_POSTER.branco, textAlign: "center" }}>
          {horario}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          color: CORES_POSTER.grena,
          textAlign: "center",
        }}
      >
        {atividade.toUpperCase()}
      </div>
      <div
        style={{
          display: "flex",
          width: 180,
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          color: CORES_POSTER.grena,
          textAlign: "center",
        }}
      >
        {local.toUpperCase()}
      </div>
    </div>
  );
}

/** Frase final livre do pôster Dia de Jogo (ex: "Atletas liberados após o almoço!"). */
export function PosterLiberacaoImg({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 24,
        fontWeight: 700,
        color: CORES_POSTER.preto,
        marginTop: 30,
        textTransform: "uppercase",
      }}
    >
      {texto}
    </div>
  );
}

export function PosterRodapeImg() {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div
        style={{
          display: "flex",
          fontFamily: "Anton",
          fontSize: 24,
          color: CORES_POSTER.grena,
          justifyContent: "center",
          marginBottom: 24,
          width: "100%",
        }}
      >
        {HASHTAG_RODAPE}
      </div>
      <div style={{ display: "flex", backgroundColor: CORES_POSTER.grena, height: 10, width: "100%" }} />
      <div
        style={{
          display: "flex",
          backgroundColor: CORES_POSTER.grena,
          paddingTop: 18,
          paddingBottom: 18,
          width: "100%",
        }}
      />
    </div>
  );
}

// Sem `fontFamily` explícita aqui de propósito: o Satori (motor por trás do ImageResponse) usa uma
// fonte padrão embutida pro texto comum, que já cobre acentuação em português. Só o título/hashtag
// (fonte Anton) precisa ser registrado explicitamente via a opção `fonts` do ImageResponse.
export const posterImagemBase = {
  width: POSTER_IMAGEM_LARGURA,
  display: "flex" as const,
  flexDirection: "column" as const,
  backgroundColor: CORES_POSTER.branco,
  position: "relative" as const,
};

// ---------------------------------------------------------------------------------------------
// Variante "lateral" (Concentração e Dia de Jogo) — moldura em barra dupla na borda esquerda,
// altura total do pôster, em vez das faixas horizontais do topo/rodapé do Relacionados. Medidas
// tiradas por análise de pixel da referência do Mateus (largura do pôster = 1191px): barra grossa
// 0–8.63%, vão em branco 8.63–9.89%, barra fina 9.89–11.97%. `posterImagemBase` já tem
// `position: relative`, então os `position: absolute` abaixo ficam relativos a ele.
// ---------------------------------------------------------------------------------------------

/**
 * Cabeçalho de Concentração/Dia de Jogo: estrelas e escudos direto no fundo branco, sem as faixas
 * vinho do Relacionados (a referência não tem essas faixas nesses dois pôsteres — só a moldura
 * lateral). Também não mostra nome de competição.
 */
export function PosterCabecalhoLateralImg({
  mandante,
  adversarioLogoUrl,
}: {
  mandante: boolean;
  adversarioLogoUrl: string | null;
}) {
  const juventus = getJuventusEscudoDataUri();
  const primeiro = mandante ? juventus : adversarioLogoUrl;
  const segundo = mandante ? adversarioLogoUrl : juventus;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 34, gap: 10 }}>
        <Estrela cor={CORES_POSTER.prata} />
        <Estrela cor={CORES_POSTER.dourado} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 26, gap: 26 }}>
        {primeiro ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primeiro} width={110} height={110} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", width: 110, height: 110 }} />
        )}
        {segundo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={segundo} width={110} height={110} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", width: 110, height: 110 }} />
        )}
      </div>
    </div>
  );
}

/** Rodapé de Concentração/Dia de Jogo: só a hashtag, sem as faixas vinho do Relacionados. */
export function PosterRodapeLateralImg() {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Anton",
        fontSize: 24,
        color: CORES_POSTER.grena,
        justifyContent: "center",
        width: "100%",
        paddingTop: 20,
        paddingBottom: 40,
      }}
    >
      {HASHTAG_RODAPE}
    </div>
  );
}

/**
 * Padding do corpo pra Concentração/Dia de Jogo — bem maior que o do Relacionados (~16% da
 * largura de cada lado, medido na referência) porque o conteúdo precisa ficar nitidamente à
 * direita da moldura lateral.
 */
export const corpoLateralImg = {
  display: "flex" as const,
  flexDirection: "column" as const,
  alignItems: "center" as const,
  paddingTop: 24,
  paddingLeft: CORPO_LATERAL_PADDING_ESQUERDA,
  paddingRight: CORPO_LATERAL_PADDING_DIREITA,
};
