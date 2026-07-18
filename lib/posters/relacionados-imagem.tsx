import React from "react";
import { CORES_POSTER } from "./estilo";
import {
  PosterCabecalhoImg,
  PosterConfrontoImg,
  PosterDadosJogoImg,
  PosterRodapeImg,
  PosterTituloImg,
  posterImagemBase,
} from "./poster-imagem-shared";

function ColunaImg({ nomes }: { nomes: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
      {nomes.map((nome, i) => (
        <div
          key={`${nome}-${i}`}
          style={{
            display: "flex",
            backgroundColor: CORES_POSTER.grena,
            paddingTop: 16,
            paddingBottom: 16,
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: CORES_POSTER.branco }}>
            {nome}
          </div>
        </div>
      ))}
    </div>
  );
}

export function relacionadosImagemJsx({
  competicao,
  mandante,
  adversarioLogoUrl,
  confrontoTexto,
  dadosJogoTexto,
  colunaEsquerda,
  colunaDireita,
}: {
  competicao: string;
  mandante: boolean;
  adversarioLogoUrl: string | null;
  confrontoTexto: string;
  dadosJogoTexto: string;
  colunaEsquerda: string[];
  colunaDireita: string[];
}) {
  return (
    <div style={posterImagemBase}>
      <PosterCabecalhoImg competicao={competicao} mandante={mandante} adversarioLogoUrl={adversarioLogoUrl} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 48px" }}>
        <PosterTituloImg texto="RELACIONADOS" />
        <PosterConfrontoImg texto={confrontoTexto} />
        <PosterDadosJogoImg texto={dadosJogoTexto} />
        <div style={{ display: "flex", width: "100%", gap: 24, paddingBottom: 40 }}>
          <ColunaImg nomes={colunaEsquerda} />
          <ColunaImg nomes={colunaDireita} />
        </div>
      </div>
      <PosterRodapeImg />
    </div>
  );
}
