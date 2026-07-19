import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type { IngressoSolicitacaoRow, JogoRow } from "@/lib/supabase/types";
import { SolicitacaoForm } from "../../solicitacao-form";
import { updateSolicitacao } from "../../actions";

export default async function EditarSolicitacaoPage({
  params,
}: {
  params: { id: string; solicitacaoId: string };
}) {
  const supabase = createClient();
  const [{ data: jogoData }, { data: solicitacaoData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase.from("ingressos_solicitacoes").select("*").eq("id", params.solicitacaoId).single(),
  ]);

  if (!jogoData || !solicitacaoData) notFound();

  const jogo = jogoData as JogoRow;
  const solicitacao = solicitacaoData as IngressoSolicitacaoRow;

  const defaultValues: Record<string, string> = {
    nomeSolicitante: solicitacao.nome_solicitante,
    quantidadeSolicitada: solicitacao.quantidade_solicitada.toString(),
    quantidadeAtendida: solicitacao.quantidade_atendida.toString(),
    observacoes: solicitacao.observacoes ?? "",
  };

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="ingressos" />
      <Link
        href={`/jogos/${jogo.id}/ingressos`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Carga de Ingressos
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar solicitação</h1>
      <div className="mt-4">
        <SolicitacaoForm
          action={updateSolicitacao}
          jogoId={jogo.id}
          solicitacaoId={solicitacao.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
