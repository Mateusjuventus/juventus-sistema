import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { CORES_POSTER, HASHTAG_RODAPE, POSTER_IMAGEM_LARGURA } from "./estilo";

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
}: {
  competicao: string;
  mandante: boolean;
  adversarioLogoUrl: string | null;
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
