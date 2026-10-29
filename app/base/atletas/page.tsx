import { redirect } from "next/navigation";

/** Prefixo do módulo "Atletas" da Base (ver `lib/auth/modulos-base.ts`) — a sidebar sempre linkava
 * direto pra aqui, mas nunca existiu uma página nesta rota (cada categoria tinha sua própria
 * listagem em `/base/atletas/[categoria]`, sem um índice). Na unificação de Atletas (28/10/2026,
 * ver docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md) esse índice passou a existir
 * de verdade em `/atletas` — este redirect aproveita pra também corrigir esse link que não ia a
 * lugar nenhum. */
export default function BaseAtletasIndicePage() {
  redirect("/atletas");
}
