import { redirect } from "next/navigation";

/** Espelha `app/atletas/[id]/contrato/page.tsx` para o Futebol de Base — rota antiga da aba
 * "Contrato", que deixou de existir em 2026-10-16. Ver comentário completo lá. */
export default function ContratoAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  redirect(`/base/atletas/${params.categoria}/${params.id}/ver`);
}
