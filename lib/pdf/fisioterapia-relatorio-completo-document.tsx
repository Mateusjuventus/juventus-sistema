import { Document, Page } from "@react-pdf/renderer";
import { sharedStyles, type LogoSrc } from "./logistica-shared";
import {
  FisioterapiaAtletaConteudo,
  type FisioterapiaRelatorioAtendimento,
  type FisioterapiaRelatorioAtleta,
  type FisioterapiaRelatorioHistoricoItem,
  type FisioterapiaRelatorioLesao,
  type FisioterapiaRelatorioQueixa,
} from "./fisioterapia-atleta-document";

/**
 * Relatório Completo de Fisioterapia — todos os atletas do elenco, em ordem alfabética, um por
 * página, cada um com exatamente o mesmo conteúdo do relatório individual (`fisioterapia-atleta-
 * document.tsx`, via `FisioterapiaAtletaConteudo` compartilhado). Um documento só, pra não precisar
 * gerar e baixar um PDF de cada vez. Ver docs/superpowers/specs/2026-09-30-fisioterapia-design.md.
 */

export interface FisioterapiaRelatorioCompletoAtleta {
  id: string;
  fotoSrc: LogoSrc;
  atleta: FisioterapiaRelatorioAtleta;
  historico: FisioterapiaRelatorioHistoricoItem[];
  lesoes: FisioterapiaRelatorioLesao[];
  queixas: FisioterapiaRelatorioQueixa[];
  atendimentos: FisioterapiaRelatorioAtendimento[];
}

export function FisioterapiaRelatorioCompletoDocument({
  juventusLogoSrc,
  atletas,
  emitidoEm,
}: {
  juventusLogoSrc: LogoSrc;
  atletas: FisioterapiaRelatorioCompletoAtleta[];
  emitidoEm: Date;
}) {
  return (
    <Document>
      {atletas.map((item) => (
        <Page key={item.id} size="A4" style={sharedStyles.page}>
          <FisioterapiaAtletaConteudo
            juventusLogoSrc={juventusLogoSrc}
            fotoSrc={item.fotoSrc}
            atleta={item.atleta}
            historico={item.historico}
            lesoes={item.lesoes}
            queixas={item.queixas}
            atendimentos={item.atendimentos}
            emitidoEm={emitidoEm}
          />
        </Page>
      ))}
    </Document>
  );
}
