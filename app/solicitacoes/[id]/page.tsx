import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { SolicitacaoItemRow, SolicitacaoRow } from "@/lib/supabase/types";
import { SolicitacaoForm } from "../solicitacao-form";
import { updateSolicitacao } from "../actions";
import { deleteSolicitacaoItem } from "./itens/actions";

export default async function EditarSolicitacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, { data: itensData }] = await Promise.all([
    supabase.from("solicitacoes").select("*").eq("id", params.id).single(),
    supabase
      .from("solicitacao_itens")
      .select("*")
      .eq("solicitacao_id", params.id)
      .order("ordem", { ascending: true }),
  ]);

  if (!data) notFound();

  const s = data as SolicitacaoRow;
  const itens = (itensData ?? []) as SolicitacaoItemRow[];
  const fotoUrls = await Promise.all(itens.map((i) => getSignedPhotoUrl(supabase, i.foto_path)));

  const defaultValues = {
    tipo: s.tipo,
    dataSolicitacao: s.data_solicitacao,
    solicitante: s.solicitante,
    setor: s.setor,
    descricaoNecessidade: s.descricao_necessidade ?? "",
    prazoSugerido: s.prazo_sugerido ?? "",
    valor: s.valor !== null ? String(s.valor) : "",
    chavePix: s.chave_pix ?? "",
    chavePixTipo: s.chave_pix_tipo ?? "",
    passageiro: s.passageiro ?? "",
    origem: s.origem ?? "",
    destino: s.destino ?? "",
    dataVoo: s.data_voo ?? "",
    horarioVoo: s.horario_voo ?? "",
  };

  return (
    <AppShell>
      <Link href="/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-grena-escuro">Editar solicitação</h1>
        <a
          href={`/solicitacoes/${s.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Gerar PDF
        </a>
      </div>
      <div className="mt-4">
        <SolicitacaoForm
          action={updateSolicitacao}
          entityId={s.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>

      {s.tipo === "compra" ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-grena-escuro">Itens solicitados</h2>
            <Link href={`/solicitacoes/${s.id}/itens/novo`} className="btn-primary">
              + Novo item
            </Link>
          </div>

          {itens.length === 0 ? (
            <div className="card mt-3 p-8 text-center text-neutral-400">Nenhum item adicionado ainda.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {itens.map((item, i) => (
                <div key={item.id} className="card flex flex-wrap items-center gap-4 p-4">
                  {fotoUrls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoUrls[i]!}
                      alt={item.item}
                      className="h-14 w-14 rounded-md border border-neutral-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">
                      sem foto
                    </div>
                  )}
                  <div className="min-w-[160px] flex-1">
                    <p className="font-medium text-neutral-800">{item.item}</p>
                    <p className="text-sm text-neutral-500">{item.quantidade}</p>
                  </div>
                  <DeleteButton action={deleteSolicitacaoItem} id={item.id} entityLabel="item" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
