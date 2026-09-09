import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaBaseTipoContrato } from "@/lib/supabase/types";

/** Rótulo por extenso, direto da mesma fonte de verdade usada pelos formulários (`schemas.ts`) —
 * evita ter o rótulo "Empréstimo"/"Iniciação" etc. escrito duas vezes em lugares diferentes. */
export const CONTRATO_ATLETA_LABEL: Record<AtletaBaseTipoContrato, string> = Object.fromEntries(
  ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
) as Record<AtletaBaseTipoContrato, string>;

/**
 * Cor e inicial por tipo de contrato — fonte única usada pelo selo redondo no `AtletaCard` e pelo
 * gráfico de pizza/legenda de `AtletasResumoFiltros` (ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md, seção 2), pra selo e fatia nunca ficarem com cores
 * diferentes pro mesmo tipo.
 *
 * `AtletaBaseTipoContrato` cobre os 4 tipos reais (a Base tem os 3 do Profissional + Iniciação —
 * ver `ATLETA_TIPO_CONTRATO_OPTIONS`/`ATLETA_BASE_TIPO_CONTRATO_OPTIONS` em
 * `lib/validation/schemas.ts`); o Profissional só usa os 3 primeiros. Não existe "Formação" no
 * sistema — só apareceu no protótipo inicial, corrigido antes de virar código.
 */
export const CONTRATO_ATLETA_COR: Record<AtletaBaseTipoContrato, string> = {
  definitivo: "#2a78d6",
  emprestimo: "#eb6834",
  amador: "#1baf7a",
  iniciacao: "#e87ba4",
};

/** Mesmas cores acima, numa variante mais escura/legível como texto (contagem na legenda do
 * gráfico) — a cor "cheia" funciona bem como preenchimento, mas fica clara demais como texto. */
export const CONTRATO_ATLETA_COR_TEXTO: Record<AtletaBaseTipoContrato, string> = {
  definitivo: "#1c5cab",
  emprestimo: "#b5501f",
  amador: "#0f7d54",
  iniciacao: "#a8355f",
};

/** Inicial exibida no selo redondo sobre a foto do atleta (`AtletaCard`). */
export const CONTRATO_ATLETA_INICIAL: Record<AtletaBaseTipoContrato, string> = {
  definitivo: "D",
  emprestimo: "E",
  amador: "A",
  iniciacao: "I",
};

export function corContratoAtleta(tipoContrato: AtletaBaseTipoContrato): string {
  return CONTRATO_ATLETA_COR[tipoContrato];
}

export function corTextoContratoAtleta(tipoContrato: AtletaBaseTipoContrato): string {
  return CONTRATO_ATLETA_COR_TEXTO[tipoContrato];
}

export function inicialContratoAtleta(tipoContrato: AtletaBaseTipoContrato): string {
  return CONTRATO_ATLETA_INICIAL[tipoContrato];
}

export function labelContratoAtleta(tipoContrato: AtletaBaseTipoContrato): string {
  return CONTRATO_ATLETA_LABEL[tipoContrato];
}
