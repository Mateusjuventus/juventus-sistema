import { notFound, redirect } from "next/navigation";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";

/** Espelha `app/base/atletas/[categoria]/[id]/page.tsx` — ver comentário completo lá. */
export default function DocumentacaoAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  redirect(`/atletas/${params.id}/documentacao`);
}
