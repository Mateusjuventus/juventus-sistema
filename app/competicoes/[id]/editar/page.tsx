import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { CompeticaoRow, TemporadaRow } from "@/lib/supabase/types";
import { atualizarCompeticao } from "../../actions";
import { CompeticaoForm } from "../../competicao-form";

export default async function EditarCompeticaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: competicaoData }, { data: temporadasData }] = await Promise.all([
    supabase.from("competicoes").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("temporadas").select("*").order("nome", { ascending: false }),
  ]);
  if (!competicaoData) notFound();
  const competicao = competicaoData as CompeticaoRow;
  const temporadas = (temporadasData ?? []) as TemporadaRow[];

  const action = atualizarCompeticao.bind(null, competicao.id);

  return (
    <AppShell>
      <Link href={`/competicoes/${competicao.id}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para {competicao.nome}
      </Link>
      <PageHeader title={`Editar — ${competicao.nome}`} />
      <CompeticaoForm temporadas={temporadas} competicao={competicao} action={action} submitLabel="Salvar alterações" />
    </AppShell>
  );
}
