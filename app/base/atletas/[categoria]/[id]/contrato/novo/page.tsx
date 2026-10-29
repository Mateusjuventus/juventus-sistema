import { notFound, redirect } from "next/navigation";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";

/** Espelha `app/base/atletas/[categoria]/[id]/page.tsx` — ver comentário completo lá. Preserva
 * `origem` na query string (ver `app/atletas/[id]/contrato/novo/page.tsx`). */
export default function NovoContratoAtletaBasePage({
  params,
  searchParams,
}: {
  params: { categoria: string; id: string };
  searchParams: { origem?: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const origem = searchParams.origem === "editar" ? "editar" : "ver";
  redirect(`/atletas/${params.id}/contrato/novo?origem=${origem}`);
}
