import React from "react";
import type { ItemProgramacaoTexto } from "./programacao-item";
import {
  PosterCabecalhoImg,
  PosterFaixaDataImg,
  PosterLinhaProgramacaoImg,
  PosterOrientacoesImg,
  PosterRodapeImg,
  PosterTituloImg,
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
  return (
    <div style={posterImagemBase}>
      <PosterCabecalhoImg competicao="" mandante={mandante} adversarioLogoUrl={adversarioLogoUrl} mostrarCompeticao={false} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 48px" }}>
        <PosterTituloImg texto="CONCENTRAÇÃO" />
        <PosterFaixaDataImg texto={dataFaixaTexto} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 36 }}>
          {itens.map((item, i) => (
            <PosterLinhaProgramacaoImg key={i} horario={item.horario} atividade={item.atividade} local={item.local} />
          ))}
        </div>
        <div style={{ display: "flex", width: "100%", paddingBottom: 40 }}>
          <PosterOrientacoesImg titulo="ORIENTAÇÕES DE CONCENTRAÇÃO:" regras={regras} />
        </div>
      </div>
      <PosterRodapeImg />
    </div>
  );
}
