import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import type { CompeticaoBaseRow, TemporadaBaseRow } from "@/lib/supabase/types";
import { atualizarCompeticaoBase } from "../../actions";
import { CompeticaoFormBase } from "../../competicao-form";

export default async function EditarCompeticaoBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: competicaoData }, { data: temporadasData }, categoriasPermitidas] = await Promise.all([
    supabase.from("competicoes_base").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("temporadas_base").select("*").order("nome", { ascending: false }),
    getCategoriasBasePermitidas(supabase),
  ]);
  if (!competicaoData) notFound();
  const competicao = competicaoData as CompeticaoBaseRow;
  if (!categoriasPermitidas.includes(competicao.categoria)) notFound();
  const temporadas = (temporadasData ?? []) as TemporadaBaseRow[];

  const action = atualizarCompeticaoBase.bind(null, competicao.id);

  return (
    <AppShell>
      <Link href={`/base/competicoes/${competicao.id}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para {competicao.nome}
      </Link>
      <PageHeader title={`Editar — ${competicao.nome}`} />
      <CompeticaoFormBase
        temporadas={temporadas}
        competicao={competicao}
        action={action}
        submitLabel="Salvar alterações"
      />
    </AppShell>
  );
}
