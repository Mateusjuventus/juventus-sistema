"use server";

import { criarContrato } from "../../../../../atletas/[id]/contrato/actions";

/**
 * Órfã desde a unificação de Atletas (28/10/2026) — `app/base/atletas/[categoria]/[id]/contrato/
 * novo/page.tsx` agora é só um redirect pra `/atletas/[id]/contrato/novo` (ver
 * docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md), que usa `criarContrato` direto
 * de `app/atletas/[id]/contrato/actions.ts`. Nada importa mais `criarContratoBase` — mantido como
 * um re-export só pra não deixar nenhum import solto quebrado enquanto o arquivo não é apagado
 * (ver relatório de arquivos órfãos da unificação).
 */
export const criarContratoBase = criarContrato;
