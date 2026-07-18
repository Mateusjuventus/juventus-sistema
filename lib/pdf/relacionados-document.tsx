import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CORES_POSTER } from "@/lib/posters/estilo";
import {
  LogoSrc,
  PosterCabecalho,
  PosterConfronto,
  PosterDadosJogo,
  PosterRodape,
  PosterTitulo,
  styles as sharedStyles,
} from "./poster-shared";

const styles = StyleSheet.create({
  colunas: { flexDirection: "row", gap: 14, marginTop: 4 },
  coluna: { flex: 1, gap: 8 },
  caixaNome: {
    backgroundColor: CORES_POSTER.grena,
    paddingVertical: 9,
  },
  textoNome: {
    fontSize: 12.5,
    fontWeight: 700,
    color: CORES_POSTER.branco,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

// Convocações maiores (mais atletas) precisam de caixas mais compactas pra tudo continuar cabendo
// numa página A4 só — um pôster que vira 2 páginas fica quebrado (a segunda quase toda em branco).
// `ALTURA_DISPONIVEL_LISTA` é o espaço vertical (em pt) que sobra numa página A4 depois de
// descontar cabeçalho, título, confronto, dados do jogo e rodapé com o layout atual — medido
// empiricamente renderizando o PDF (ver scripts/test-poster-relacionados-pdf.tsx) e reajustado se o
// layout do cabeçalho/rodapé mudar de tamanho no futuro. Cada linha da lista recebe
// `ALTURA_DISPONIVEL_LISTA / linhas`, com um teto (tamanho "cheio", igual ao exemplo original) e um
// piso (pra nunca ficar ilegível mesmo com uma convocação enorme).
const ALTURA_DISPONIVEL_LISTA = 498;
const ALTURA_LINHA_MAXIMA = 39; // gap 8 + paddingVertical 8×2 + ~15 de altura de linha do texto
const ALTURA_LINHA_MINIMA = 16;

function calcularEstiloLista(linhas: number) {
  const alturaLinha = Math.min(
    ALTURA_LINHA_MAXIMA,
    Math.max(ALTURA_LINHA_MINIMA, ALTURA_DISPONIVEL_LISTA / Math.max(linhas, 1)),
  );
  const k = alturaLinha / ALTURA_LINHA_MAXIMA;
  return {
    gap: 8 * k,
    paddingVertical: 8 * k,
    fontSize: 12.5 * k,
  };
}

export interface RelacionadosDocumentProps {
  competicao: string;
  mandante: boolean;
  adversarioLogoSrc: LogoSrc;
  confrontoTexto: string;
  dadosJogoTexto: string;
  colunaEsquerda: string[];
  colunaDireita: string[];
}

function Coluna({
  nomes,
  gap,
  estiloCaixa,
  estiloTexto,
}: {
  nomes: string[];
  gap: number;
  estiloCaixa: { paddingVertical: number };
  estiloTexto: { fontSize: number };
}) {
  return (
    <View style={[styles.coluna, { gap }]}>
      {nomes.map((nome, i) => (
        <View style={[styles.caixaNome, estiloCaixa]} key={`${nome}-${i}`}>
          <Text style={[styles.textoNome, estiloTexto]}>{nome}</Text>
        </View>
      ))}
    </View>
  );
}

export function RelacionadosDocument({
  competicao,
  mandante,
  adversarioLogoSrc,
  confrontoTexto,
  dadosJogoTexto,
  colunaEsquerda,
  colunaDireita,
}: RelacionadosDocumentProps) {
  const linhas = Math.max(colunaEsquerda.length, colunaDireita.length);
  const { gap, paddingVertical, fontSize } = calcularEstiloLista(linhas);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <PosterCabecalho competicao={competicao} mandante={mandante} adversarioLogoSrc={adversarioLogoSrc} />
        <View style={sharedStyles.corpo}>
          <PosterTitulo texto="RELACIONADOS" />
          <PosterConfronto texto={confrontoTexto} />
          <PosterDadosJogo texto={dadosJogoTexto} />
          <View style={styles.colunas}>
            <Coluna nomes={colunaEsquerda} gap={gap} estiloCaixa={{ paddingVertical }} estiloTexto={{ fontSize }} />
            <Coluna nomes={colunaDireita} gap={gap} estiloCaixa={{ paddingVertical }} estiloTexto={{ fontSize }} />
          </View>
        </View>
        <PosterRodape />
      </Page>
    </Document>
  );
}
