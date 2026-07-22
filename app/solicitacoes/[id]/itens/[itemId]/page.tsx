import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { SolicitacaoItemRow, SolicitacaoRow } from "@/lib/supabase/types";
import { SolicitacaoItemForm } from "../item-form";
import { updateSolicitacaoItem } from "../actions";

export default async function EditarItemSolicitacaoPage({
  params,
}: {
  params: { id: string; itemId: string };
}) {
  const supabase = createClient();
  const [{ data: solicitacaoData }, { data: itemData }] = await Promise.all([
    supabase.from("solicitacoes").select("*").eq("id", params.id).single(),
    supabase.from("solicitacao_itens").select("*").eq("id", params.itemId).single(),
  ]);

  if (!solicitacaoData || !itemData) notFound();
  const solicitacao = solicitacaoData as SolicitacaoRow;
  const item = itemData as SolicitacaoItemRow;

  const fotoAtualUrl = solicitacao.tipo === "compra" ? await getSignedPhotoUrl(supabase, item.foto_path) : null;

  const defaultValues: Record<string, string> = {
    quantidade: item.quantidade ?? "",
    item: item.item ?? "",
    descricao: item.descricao ?? "",
    valor: item.valor !== null ? String(item.valor) : "",
    passageiro: item.passageiro ?? "",
    origem: item.origem ?? "",
    destino: item.destino ?? "",
    dataVoo: item.data_voo ?? "",
    horarioVoo: item.horario_voo ? item.horario_voo.slice(0, 5) : "",
    observacao: item.observacao ?? "",
  };

  const titulo = solicitacao.tipo === "passagem_aerea" ? "Editar passageiro" : "Editar item";

  return (
    <AppShell>
      <Link href={`/solicitacoes/${solicitacao.id}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para a solicitação
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">{titulo}</h1>
      <div className="mt-4">
        <SolicitacaoItemForm
          action={updateSolicitacaoItem}
          solicitacaoId={solicitacao.id}
          tipo={solicitacao.tipo}
          itemId={item.id}
          defaultValues={defaultValues}
          fotoAtualUrl={fotoAtualUrl}
        />
      </div>
    </AppShell>
  );
}
