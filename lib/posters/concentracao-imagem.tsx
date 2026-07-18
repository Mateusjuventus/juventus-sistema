import React from "react";
import type { ItemProgramacaoTexto } from "./programacao-item";
import {
  PosterCabecalhoLateralImg,
  PosterFaixaDataImg,
  PosterLinhaProgramacaoImg,
  PosterOrientacoesImg,
  PosterRodapeLateralImg,
  PosterTituloImg,
  corpoLateralImg,
  posterImagemBase,
} from "./poster-imagem-shared";

export function concentracaoImagemJsx({
  mandante,
  adversarioLogoUrl,
  dataFaixaTexto,
  itens,
  regras,
}: {
  mandante: boolean;
  adversarioLogoUrl: string | null;
  dataFaixaTexto: string;
  itens: ItemProgramacaoTexto[];
  regras: string[];
}) {
  // A moldura lateral (barra dupla vinho na borda esquerda) não faz parte deste JSX — é desenhada
  // depois, em cima da imagem já cortada, por `renderizarPosterComoJpeg(jsx, { comMolduraLateral:
  // true })` (ver o porquê em `lib/posters/renderizar-imagem.ts`).
  return (
    <div style={posterImagemBase}>
      <PosterCabecalhoLateralImg mandante={mandante} adversarioLogoUrl={adversarioLogoUrl} />
      <div style={corpoLateralImg}>
        <PosterTituloImg texto="CONCENTRAÇÃO" />
        <PosterFaixaDataImg texto={dataFaixaTexto} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 36 }}>
          {itens.map((item, i) => (
            <PosterLinhaProgramacaoImg key={i} horario={item.horario} atividade={item.atividade} local={item.local} />
          ))}
        </div>
        <div style={{ display: "flex", width: "100%" }}>
          <PosterOrientacoesImg titulo="ORIENTAÇÕES DE CONCENTRAÇÃO:" regras={regras} />
        </div>
      </div>
      <PosterRodapeLateralImg />
    </div>
  );
}
