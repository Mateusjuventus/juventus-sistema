import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { SolicitacaoBaseRow } from "@/lib/supabase/types";
import { SolicitacaoItemForm } from "../item-form";
import { createSolicitacaoItemBase } from "../actions";

export default async function NovoItemSolicitacaoBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("solicitacoes_base").select("*").eq("id", params.id).single();

  if (!data) notFound();
  const solicitacao = data as SolicitacaoBaseRow;

  return (
    <AppShell departamento="futebol_base">
      <Link href={`/base/solicitacoes/${solicitacao.id}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para a solicitação
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo item</h1>
      <div className="mt-4">
        <SolicitacaoItemForm action={createSolicitacaoItemBase} solicitacaoId={solicitacao.id} />
      </div>
    </AppShell>
  );
}
