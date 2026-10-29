import { notFound, redirect } from "next/navigation";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";

/** Editar atleta da Base — unificada em 28/10/2026 com o Profissional em `/atletas/[id]` (ver
 * docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md e `app/atletas/[id]/page.tsx`).
 * Fica só pra não quebrar um link/favorito antigo pra esta URL. */
export default function EditarAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  redirect(`/atletas/${params.id}`);
}
