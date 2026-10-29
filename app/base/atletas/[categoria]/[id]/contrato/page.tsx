import { notFound, redirect } from "next/navigation";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";

/** Rota antiga da aba "Contrato" — já era um redirect pra "Ver atleta" desde 2026-10-16 (ver
 * histórico), e agora aponta pra rota unificada em `/atletas/[id]/ver`, igual aos demais redirects
 * deste diretório — ver comentário completo em `app/base/atletas/[categoria]/[id]/page.tsx`. */
export default function ContratoAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  redirect(`/atletas/${params.id}/ver`);
}
