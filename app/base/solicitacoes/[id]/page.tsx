import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { SolicitacaoItemBaseRow, SolicitacaoBaseRow } from "@/lib/supabase/types";
import { SolicitacaoForm } from "../solicitacao-form";
import { updateSolicitacaoBase } from "../actions";
import { deleteSolicitacaoItemBase } from "./itens/actions";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Espelha `app/solicitacoes/[id]/page.tsx` para o Futebol de Base. */
export default async function EditarSolicitacaoBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, { data: itensData }] = await Promise.all([
    supabase.from("solicitacoes_base").select("*").eq("id", params.id).single(),
    supabase
      .from("solicitacao_itens_base")
      .select("*")
      .eq("solicitacao_id", params.id)
      .order("ordem", { ascending: true }),
  ]);

  if (!data) notFound();

  const s = data as SolicitacaoBaseRow;
  const itens = (itensData ?? []) as SolicitacaoItemBaseRow[];
  const fotoUrls = await Promise.all(itens.map((i) => getSignedPhotoUrl(supabase, i.foto_path)));

  const defaultValues = {
    tipo: s.tipo,
    dataSolicitacao: s.data_solicitacao,
    solicitante: s.solicitante,
    setor: s.setor,
    descricaoNecessidade: s.descricao_necessidade ?? "",
    prazoSugerido: s.prazo_sugerido ?? "",
    chavePix: s.chave_pix ?? "",
    chavePixTipo: s.chave_pix_tipo ?? "",
    banco: s.banco ?? "",
    agencia: s.agencia ?? "",
    conta: s.conta ?? "",
    tipoConta: s.tipo_conta ?? "",
    titularConta: s.titular_conta ?? "",
  };

  const temItens = s.tipo === "compra" || s.tipo === "pagamento" || s.tipo === "reembolso" || s.tipo === "passagem_aerea";

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-grena-escuro">Editar solicitação</h1>
        <a
          href={`/base/solicitacoes/${s.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Gerar PDF
        </a>
      </div>
      <div className="mt-4">
        <SolicitacaoForm
          action={updateSolicitacaoBase}
          entityId={s.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>

      {temItens ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-grena-escuro">
              {s.tipo === "passagem_aerea" ? "Passageiros" : "Itens solicitados"}
            </h2>
            {s.tipo === "pagamento" || s.tipo === "reembolso" ? (
              <p className="text-sm font-semibold text-neutral-600">Total: {formatMoeda(s.valor)}</p>
            ) : null}
            <Link href={`/base/solicitacoes/${s.id}/itens/novo`} className="btn-primary">
              {s.tipo === "passagem_aerea" ? "+ Novo passageiro" : "+ Novo item"}
            </Link>
          </div>

          {itens.length === 0 ? (
            <div className="card mt-3 p-8 text-center text-neutral-400">
              {s.tipo === "passagem_aerea" ? "Nenhum passageiro adicionado ainda." : "Nenhum item adicionado ainda."}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {itens.map((item, i) => (
                <div key={item.id} className="card flex flex-wrap items-center gap-4 p-4">
                  {s.tipo === "compra" ? (
                    <>
                      {fotoUrls[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fotoUrls[i]!}
                          alt={item.item ?? ""}
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
                        {item.observacao ? <p className="text-sm text-neutral-500">{item.observacao}</p> : null}
                      </div>
                    </>
                  ) : null}

                  {s.tipo === "pagamento" || s.tipo === "reembolso" ? (
                    <div className="min-w-[160px] flex-1">
                      <p className="font-medium text-neutral-800">{item.descricao}</p>
                      {item.observacao ? <p className="text-sm text-neutral-500">{item.observacao}</p> : null}
                    </div>
                  ) : null}
                  {s.tipo === "pagamento" || s.tipo === "reembolso" ? (
                    <p className="font-semibold text-neutral-700">{formatMoeda(item.valor)}</p>
                  ) : null}

                  {s.tipo === "passagem_aerea" ? (
                    <div className="min-w-[160px] flex-1">
                      <p className="font-medium text-neutral-800">{item.passageiro}</p>
                      <p className="text-sm text-neutral-500">
                        {item.origem} → {item.destino} · {formatData(item.data_voo)}
                        {item.horario_voo ? ` às ${item.horario_voo.slice(0, 5)}` : ""}
                      </p>
                      {item.observacao ? <p className="text-sm text-neutral-500">{item.observacao}</p> : null}
                    </div>
                  ) : null}

                  <div className="flex shrink-0 gap-2">
                    <Link href={`/base/solicitacoes/${s.id}/itens/${item.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton
                      action={deleteSolicitacaoItemBase}
                      id={item.id}
                      entityLabel={s.tipo === "passagem_aerea" ? "passageiro" : "item"}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
