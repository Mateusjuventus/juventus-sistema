import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedTermoDocumentoUrl } from "@/lib/supabase/storage";
import { hojeBrasilia } from "@/lib/data-brasil";
import {
  formatMoeda,
  itensParaTotal,
  SITUACAO_LABEL,
  situacaoDoTermo,
  TERMO_TIPO_LABEL,
  totalDoItem,
  totalDoTermo,
} from "@/lib/futebol/termo-retirada";
import type {
  TermoRetiradaAnexoRow,
  TermoRetiradaAnexoTipo,
  TermoRetiradaItemRow,
  TermoRetiradaRow,
} from "@/lib/supabase/types";
import { enviarAnexoTermo, excluirAnexoTermo, excluirTermo, registrarDevolucao } from "../actions";

const ANEXO_TIPO_LABEL: Record<TermoRetiradaAnexoTipo, string> = {
  assinado: "Termo assinado",
  devolucao: "Comprovante de devolução",
  outro: "Outro documento",
};

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function TermoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: termoData }, { data: itensData }, { data: anexosData }] = await Promise.all([
    supabase.from("termos_retirada").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("termo_retirada_itens").select("*").eq("termo_id", params.id).order("ordem"),
    supabase
      .from("termo_retirada_anexos")
      .select("*")
      .eq("termo_id", params.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!termoData) notFound();

  const termo = termoData as TermoRetiradaRow;
  const itens = (itensData ?? []) as TermoRetiradaItemRow[];
  const anexos = await Promise.all(
    ((anexosData ?? []) as TermoRetiradaAnexoRow[]).map(async (a) => ({
      ...a,
      url: await getSignedTermoDocumentoUrl(supabase, a.arquivo_path),
    })),
  );
  const total = totalDoTermo(itensParaTotal(itens));
  const situacao = situacaoDoTermo(termo, hojeBrasilia());
  const devolucaoAction = registrarDevolucao.bind(null, termo.id);
  const enviarAnexoAction = enviarAnexoTermo.bind(null, termo.id);
  const excluirAnexoAction = excluirAnexoTermo.bind(null, termo.id);

  return (
    <AppShell>
      <Link href="/termos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Termos de Retirada
      </Link>
      <PageHeader title={`Termo Nº ${String(termo.numero).padStart(4, "0")}`} />
      <p className="mt-1 text-center text-sm text-neutral-500">
        {TERMO_TIPO_LABEL[termo.tipo]} · {formatData(termo.data)} · {SITUACAO_LABEL[situacao]}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <a href={`/termos/${termo.id}/pdf`} target="_blank" className="btn-primary">
          Gerar PDF para assinar
        </a>
        <Link href={`/termos/${termo.id}/editar`} className="btn-secondary">
          Editar
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-base font-bold text-grena-escuro">Responsável</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Nome</dt>
              <dd className="font-medium text-neutral-800">{termo.responsavel_nome}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">RG / CPF</dt>
              <dd className="text-neutral-800">{termo.responsavel_documento ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Função</dt>
              <dd className="text-neutral-800">{termo.funcao ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Departamento</dt>
              <dd className="text-neutral-800">{termo.departamento ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Finalidade</dt>
              <dd className="text-right text-neutral-800">{termo.finalidade ?? "—"}</dd>
            </div>
            {termo.tipo === "emprestimo" ? (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Devolução</dt>
                <dd className="text-right text-neutral-800">
                  {termo.previsao_devolucao
                    ? `Até ${formatData(termo.previsao_devolucao)}`
                    : "Ao término do vínculo/função ou quando solicitado"}
                </dd>
              </div>
            ) : null}
            {termo.observacoes ? (
              <div>
                <dt className="text-neutral-500">Observações</dt>
                <dd className="mt-1 whitespace-pre-wrap text-neutral-700">{termo.observacoes}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {termo.tipo === "emprestimo" ? (
          <section className="card p-5">
            <h2 className="text-base font-bold text-grena-escuro">Devolução</h2>
            {termo.devolvido_em ? (
              <>
                <p className="mt-2 text-sm text-neutral-700">
                  Devolvido em <span className="font-semibold">{formatData(termo.devolvido_em)}</span>.
                </p>
                {termo.devolucao_observacoes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    {termo.devolucao_observacoes}
                  </p>
                ) : null}
                <form action={devolucaoAction} className="mt-3">
                  <input type="hidden" name="desfazer" value="1" />
                  <button type="submit" className="text-xs font-medium text-neutral-500 hover:text-red-600">
                    Desfazer devolução
                  </button>
                </form>
              </>
            ) : (
              <form action={devolucaoAction} className="mt-3 space-y-3">
                <div>
                  <label htmlFor="devolvidoEm" className="field-label">
                    Data da devolução
                  </label>
                  <input
                    id="devolvidoEm"
                    name="devolvidoEm"
                    type="date"
                    className="field-input"
                    defaultValue={hojeBrasilia()}
                  />
                </div>
                <div>
                  <label htmlFor="devolucaoObservacoes" className="field-label">
                    Observações da devolução
                  </label>
                  <textarea
                    id="devolucaoObservacoes"
                    name="devolucaoObservacoes"
                    rows={2}
                    className="field-input"
                    placeholder="Ex.: devolvido em bom estado; item X com avaria"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Registrar devolução
                </button>
              </form>
            )}
          </section>
        ) : null}
      </div>

      <section className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3 text-center">Qtd.</th>
              <th className="px-4 py-3 text-right">Valor unitário</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.map((item) => {
              const totalItem = totalDoItem({ quantidade: item.quantidade, valorUnitario: item.valor_unitario });
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-neutral-800">{item.descricao}</td>
                  <td className="px-4 py-3 text-center text-neutral-600">{item.quantidade}</td>
                  <td className="px-4 py-3 text-right text-neutral-600">
                    {item.valor_unitario === null ? "—" : formatMoeda(item.valor_unitario)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-800">
                    {totalItem === null ? "—" : formatMoeda(totalItem)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {total > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={3}>
                  Total sugerido
                </td>
                <td className="px-4 py-3 text-right">{formatMoeda(total)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-base font-bold text-grena-escuro">Texto de responsabilidade</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {termo.texto_responsabilidade}
        </p>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-base font-bold text-grena-escuro">Documento assinado e anexos</h2>
        <p className="mt-1 text-xs text-neutral-400">
          O sistema não assina digitalmente: gere o PDF, imprima, colha as assinaturas e anexe aqui o
          documento digitalizado (ou a foto). É o anexo que dá valor de comprovante ao registro.
        </p>

        <div className="mt-3 space-y-2">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-linha p-3"
            >
              <div>
                {anexo.url ? (
                  <a
                    href={anexo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-grena hover:underline"
                  >
                    📎 {anexo.nome}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-neutral-500">📎 {anexo.nome}</span>
                )}
                <p className="text-xs text-neutral-400">
                  {ANEXO_TIPO_LABEL[anexo.tipo]} · enviado em {formatData(anexo.created_at.slice(0, 10))}
                </p>
              </div>
              <form action={excluirAnexoAction}>
                <input type="hidden" name="id" value={anexo.id} />
                <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                  Excluir
                </button>
              </form>
            </div>
          ))}
          {anexos.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum documento anexado ainda.</p>
          ) : null}
        </div>

        <form action={enviarAnexoAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-linha pt-4">
          <div>
            <label htmlFor="tipo" className="field-label">
              Tipo
            </label>
            <select id="tipo" name="tipo" className="field-input w-auto" defaultValue="assinado">
              <option value="assinado">Termo assinado</option>
              <option value="devolucao">Comprovante de devolução</option>
              <option value="outro">Outro documento</option>
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="nome" className="field-label">
              Nome (opcional)
            </label>
            <input id="nome" name="nome" className="field-input" placeholder="Ex.: termo assinado — via do clube" />
          </div>
          <div className="min-w-[200px] flex-1">
            <label htmlFor="arquivo" className="field-label">
              Arquivo (PDF ou foto)
            </label>
            <input id="arquivo" name="arquivo" type="file" accept="application/pdf,image/*" className="field-input" required />
          </div>
          <button type="submit" className="btn-primary">
            Anexar
          </button>
        </form>
      </section>

      <div className="mt-8 flex justify-end border-t border-linha pt-4">
        <DeleteButton action={excluirTermo} id={termo.id} entityLabel="termo" />
      </div>
    </AppShell>
  );
}
