import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";

/** Rota antiga de "+ Novo atleta" da Base — unificada em 28/10/2026 com o Profissional em
 * `/atletas/novo?categoria=...` (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-
 * design.md e `app/atletas/novo/page.tsx`). Fica só pra não quebrar um link/favorito antigo. */
export default function NovoAtletaBasePage({ params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  redirect(`/atletas/novo?categoria=${params.categoria}`);
}
