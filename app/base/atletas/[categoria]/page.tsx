import { notFound, redirect } from "next/navigation";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";

/** Listagem de Atletas por categoria da Base — unificada em 28/10/2026 com o Profissional em
 * `/atletas?categoria=...` (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md e
 * `app/atletas/page.tsx`). Fica só pra não quebrar um link/favorito antigo pra esta URL. */
export default function AtletasBaseCategoriaPage({ params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  redirect(`/atletas?categoria=${params.categoria}`);
}
