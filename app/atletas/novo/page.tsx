import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AtletaForm } from "../atleta-form";
import { createAtleta } from "../actions";

/** "+ Novo atleta" — aceita `?categoria=` opcional (vem do botão da listagem, tanto do índice
 * `/atletas` quanto de `/atletas?categoria=X`, ver `app/atletas/page.tsx`) só pra pré-selecionar o
 * campo Categoria do formulário; sem o parâmetro, o campo abre em branco (cadastro direto de
 * `/atletas`, sem categoria anterior nenhuma pra sugerir). */
export default function NovoAtletaPage({ searchParams }: { searchParams: { categoria?: string } }) {
  const categoria = searchParams.categoria ?? "";
  const voltarHref = categoria ? `/atletas?categoria=${categoria}` : "/atletas";

  return (
    <AppShell breadcrumb="Novo atleta">
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo atleta</h1>
      <div className="mt-4">
        <AtletaForm
          action={createAtleta}
          defaultValues={categoria ? { categoria } : undefined}
          submitLabel="Cadastrar atleta"
        />
      </div>
    </AppShell>
  );
}
