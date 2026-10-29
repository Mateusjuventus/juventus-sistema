/**
 * Histórico de Anotações do atleta (aba "Anotações", Profissional e Base) — ver
 * docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md.
 *
 * Módulo puro (sem depender do Supabase), mesmo espírito de `lib/futebol/ficha-atleta.ts` e de
 * `resolverCategoriasBasePermitidas` (lib/auth/role.ts): a lógica de montar a linha do tempo fica
 * separada da busca de dados, pra poder ser testada sem simular um client do Supabase e pra ser
 * reaproveitada igual pela tela e pela rota de PDF da Ficha.
 *
 * Só a Base tem a entrada "virtual" de Dispensa — o Profissional não tem Relatório de Dispensa (ver
 * a spec, "Fora de escopo"), então lá o histórico é só as anotações mesmo.
 */

import type { AtletaAnotacaoRow } from "@/lib/supabase/types";

export interface ItemHistoricoAtleta {
  tipo: "anotacao" | "dispensa";
  id: string;
  texto: string;
  autor: string | null;
  /** ISO 8601 — data de criação da anotação, ou `dispensado_em`/`dispensa_data` da entrada virtual
   * de Dispensa (nessa ordem de preferência: `dispensado_em` é mais preciso, com hora; cai pra
   * `dispensa_data`, só a data, quando o relatório foi gerado antes de `dispensado_em` existir ou
   * por algum outro motivo não tiver sido gravado). */
  data: string;
  /** Só na entrada de Dispensa — link pro PDF já existente. A tela usa isto pra não desenhar o botão
   * de apagar nessa entrada (ela não é uma linha de `atleta_anotacoes`/`atleta_base_anotacoes`, não
   * existe o que apagar por aqui). */
  linkPdf?: string;
}

/** Linha do tempo do Profissional — só as anotações, mais recente primeiro. */
export function montarHistoricoAtleta(anotacoes: AtletaAnotacaoRow[]): ItemHistoricoAtleta[] {
  return [...anotacoes]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((a) => ({
      tipo: "anotacao" as const,
      id: a.id,
      texto: a.texto,
      autor: a.criado_por_nome,
      data: a.created_at,
    }));
}

interface DadosDispensaBase {
  dispensa_data: string | null;
  dispensa_motivo: string | null;
  dispensado_em: string | null;
}

/** Linha do tempo da Base — mistura as anotações com a entrada virtual de Dispensa (quando o atleta
 * tiver `dispensa_data` preenchida), ordenado por data, mais recente primeiro. `dispensadoPorNome` é
 * resolvido por quem chama (consulta simples em `perfis` pelo id salvo em `dispensado_por`) — esta
 * função continua pura, sem acessar o banco. */
export function montarHistoricoAtletaBase(
  anotacoes: AtletaAnotacaoRow[],
  atleta: DadosDispensaBase,
  dispensadoPorNome: string | null,
  linkPdfDispensa: string,
): ItemHistoricoAtleta[] {
  const itens: ItemHistoricoAtleta[] = anotacoes.map((a) => ({
    tipo: "anotacao" as const,
    id: a.id,
    texto: a.texto,
    autor: a.criado_por_nome,
    data: a.created_at,
  }));

  if (atleta.dispensa_data) {
    itens.push({
      tipo: "dispensa",
      id: "dispensa",
      texto: atleta.dispensa_motivo ?? "Relatório de Dispensa gerado.",
      autor: dispensadoPorNome,
      data: atleta.dispensado_em ?? atleta.dispensa_data,
      linkPdf: linkPdfDispensa,
    });
  }

  return itens.sort((a, b) => b.data.localeCompare(a.data));
}
