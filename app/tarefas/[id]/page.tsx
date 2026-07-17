import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTarefasVisiveis } from "@/lib/auth/role";
import type { TarefaRow } from "@/lib/supabase/types";
import { TarefaForm } from "../tarefa-form";
import { updateTarefa } from "../actions";

export default async function EditarTarefaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, categoriasPermitidas] = await Promise.all([
    supabase.from("tarefas").select("*").eq("id", params.id).single(),
    getCategoriasTarefasVisiveis(supabase),
  ]);

  if (!data) notFound();

  const t = data as TarefaRow;

  const defaultValues: Record<string, string> = {
    titulo: t.titulo,
    descricao: t.descricao ?? "",
    categoria: t.categoria,
    status: t.status,
    prazo: t.prazo ?? "",
  };

  return (
    <AppShell>
      <Link href="/tarefas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar tarefa</h1>
      <div className="mt-4">
        <TarefaForm
          action={updateTarefa}
          entityId={t.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
          categoriasPermitidas={categoriasPermitidas}
        />
      </div>
    </AppShell>
  );
}
