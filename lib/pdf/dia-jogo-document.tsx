import React from "react";
import { Document, Page, View } from "@react-pdf/renderer";
import type { ItemProgramacaoTexto } from "@/lib/posters/programacao-item";
import {
  LogoSrc,
  PosterCabecalhoLateral,
  PosterFaixaData,
  PosterLiberacao,
  PosterLinhaProgramacao,
  PosterMolduraLateral,
  PosterRodapeLateral,
  PosterTitulo,
  styles as sharedStyles,
} from "./poster-shared";

export interface DiaJogoDocumentProps {
  mandante: boolean;
  adversarioLogoSrc: LogoSrc;
  dataFaixaTexto: string;
  itens: ItemProgramacaoTexto[];
  liberacaoTexto: string | null;
}

export function DiaJogoDocument({
  mandante,
  adversarioLogoSrc,
  dataFaixaTexto,
  itens,
  liberacaoTexto,
}: DiaJogoDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <PosterMolduraLateral />
        <PosterCabecalhoLateral mandante={mandante} adversarioLogoSrc={adversarioLogoSrc} />
        <View style={sharedStyles.corpoLateral}>
          <PosterTitulo texto="DIA DE JOGO" />
          <PosterFaixaData texto={dataFaixaTexto} />
          <View style={{ marginTop: 22 }}>
            {itens.map((item, i) => (
              <PosterLinhaProgramacao
                key={i}
                horario={item.horario}
                atividade={item.atividade}
                local={item.local}
              />
            ))}
          </View>
          {liberacaoTexto ? <PosterLiberacao texto={liberacaoTexto} /> : null}
        </View>
        <PosterRodapeLateral />
      </Page>
    </Document>
  );
}
