import React from "react";
import type { ItemProgramacaoTexto } from "./programacao-item";
import {
  PosterCabecalhoLateralImg,
  PosterFaixaDataImg,
  PosterLiberacaoImg,
  PosterLinhaProgramacaoImg,
  PosterRodapeLateralImg,
  PosterTituloImg,
  corpoLateralImg,
  posterImagemBase,
} from "./poster-imagem-shared";

export function diaJogoImagemJsx({
  mandante,
  adversarioLogoUrl,
  dataFaixaTexto,
  itens,
  liberacaoTexto,
}: {
  mandante: boolean;
  adversarioLogoUrl: string | null;
  dataFaixaTexto: string;
  itens: ItemProgramacaoTexto[];
  liberacaoTexto: string | null;
}) {
  // A moldura lateral (barra dupla vinho na borda esquerda) não faz parte deste JSX — é desenhada
  // depois, em cima da imagem já cortada, por `renderizarPosterComoJpeg(jsx, { comMolduraLateral:
  // true })` (ver o porquê em `lib/posters/renderizar-imagem.ts`).
  return (
    <div style={posterImagemBase}>
      <PosterCabecalhoLateralImg mandante={mandante} adversarioLogoUrl={adversarioLogoUrl} />
      <div style={corpoLateralImg}>
        <PosterTituloImg texto="DIA DE JOGO" />
        <PosterFaixaDataImg texto={dataFaixaTexto} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 36 }}>
          {itens.map((item, i) => (
            <PosterLinhaProgramacaoImg key={i} horario={item.horario} atividade={item.atividade} local={item.local} />
          ))}
        </div>
        {liberacaoTexto ? (
          <div style={{ display: "flex", width: "100%" }}>
            <PosterLiberacaoImg texto={liberacaoTexto} />
          </div>
        ) : null}
      </div>
      <PosterRodapeLateralImg />
    </div>
  );
}
