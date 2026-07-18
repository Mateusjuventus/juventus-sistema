import React from "react";
import { Document, Page, View } from "@react-pdf/renderer";
import type { ItemProgramacaoTexto } from "@/lib/posters/programacao-item";
import {
  LogoSrc,
  PosterCabecalho,
  PosterFaixaData,
  PosterLinhaProgramacao,
  PosterOrientacoes,
  PosterRodape,
  PosterTitulo,
  styles as sharedStyles,
} from "./poster-shared";

export interface ConcentracaoDocumentProps {
  mandante: boolean;
  adversarioLogoSrc: LogoSrc;
  dataFaixaTexto: string;
  itens: ItemProgramacaoTexto[];
  regras: string[];
}

export function ConcentracaoDocument({
  mandante,
  adversarioLogoSrc,
  dataFaixaTexto,
  itens,
  regras,
}: ConcentracaoDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <PosterCabecalho
          competicao=""
          mandante={mandante}
          adversarioLogoSrc={adversarioLogoSrc}
          mostrarCompeticao={false}
        />
        <View style={sharedStyles.corpo}>
          <PosterTitulo texto="CONCENTRAÇÃO" />
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
          <PosterOrientacoes titulo="ORIENTAÇÕES DE CONCENTRAÇÃO:" regras={regras} />
        </View>
        <PosterRodape />
      </Page>
    </Document>
  );
}
