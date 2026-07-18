import React from "react";
import type { ItemProgramacaoTexto } from "./programacao-item";
import {
  PosterCabecalhoImg,
  PosterFaixaDataImg,
  PosterLiberacaoImg,
  PosterLinhaProgramacaoImg,
  PosterRodapeImg,
  PosterTituloImg,
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
  return (
    <div style={posterImagemBase}>
      <PosterCabecalhoImg competicao="" mandante={mandante} adversarioLogoUrl={adversarioLogoUrl} mostrarCompeticao={false} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 48px" }}>
        <PosterTituloImg texto="DIA DE JOGO" />
        <PosterFaixaDataImg texto={dataFaixaTexto} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 36 }}>
          {itens.map((item, i) => (
            <PosterLinhaProgramacaoImg key={i} horario={item.horario} atividade={item.atividade} local={item.local} />
          ))}
        </div>
        {liberacaoTexto ? (
          <div style={{ display: "flex", width: "100%", paddingBottom: 40 }}>
            <PosterLiberacaoImg texto={liberacaoTexto} />
          </div>
        ) : (
          <div style={{ display: "flex", paddingBottom: 20 }} />
        )}
      </div>
      <PosterRodapeImg />
    </div>
  );
}
