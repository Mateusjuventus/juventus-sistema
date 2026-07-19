import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type { JogoRow } from "@/lib/supabase/types";
import { SolicitacaoForm } from "../../solicitacao-form";
import { createSolicitacao } from "../../actions";

export default async function NovaSolicitacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();

  if (!jogoData) notFound();
  const jogo = jogoData as JogoRow;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="ingressos" />
      <Link
        href={`/jogos/${jogo.id}/ingressos`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Carga de Ingressos
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova solicitação</h1>
      <div className="mt-4">
        <SolicitacaoForm action={createSolicitacao} jogoId={jogo.id} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
