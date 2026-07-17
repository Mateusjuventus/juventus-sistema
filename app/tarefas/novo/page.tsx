import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTarefasVisiveis } from "@/lib/auth/role";
import { TarefaForm } from "../tarefa-form";
import { createTarefa } from "../actions";

export default async function NovaTarefaPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoria = searchParams.categoria ?? "";
  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasTarefasVisiveis(supabase);

  return (
    <AppShell>
      <Link href="/tarefas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova tarefa</h1>
      <div className="mt-4">
        <TarefaForm
          action={createTarefa}
          submitLabel="Cadastrar"
          defaultValues={categoria ? { categoria } : undefined}
          categoriasPermitidas={categoriasPermitidas}
        />
      </div>
    </AppShell>
  );
}
