"use client";

import { useFormState } from "react-dom";
import { ReciboLinha } from "@/components/recibo-linha";
import { SubmitButton } from "@/components/submit-button";
import { funcaoCadastroStaff } from "@/lib/futebol/funcao-staff";
import type { ReciboJogoBaseRow, StaffOperacionalBaseComFuncaoRow } from "@/lib/supabase/types";
import type { ReciboFormState } from "../operacao-actions";

const initialState: ReciboFormState = {};

/** Espelha `app/jogos/[id]/recibo/recibo-form.tsx` para o Futebol de Base. Recibo de Pagamento é
 * só pra Staff Operacional — Comissão Técnica não entra aqui. */
export function ReciboFormBase({
  action,
  jogoId,
  staff,
  recibos,
}: {
  action: (prevState: ReciboFormState, formData: FormData) => Promise<ReciboFormState>;
  jogoId: string;
  staff: StaffOperacionalBaseComFuncaoRow[];
  recibos: ReciboJogoBaseRow[];
}) {
  const [state, formAction] = useFormState(action, initialState);

  const reciboDe = (pessoaTipo: "staff", pessoaId: string) =>
    recibos.find((r) => r.pessoa_tipo === pessoaTipo && r.pessoa_id === pessoaId);

  const pessoas = staff.map((s) => ({
    tipo: "staff" as const,
    id: s.id,
    nome: s.nome_completo,
    extra: s.funcao?.nome ?? "—",
    valorPadrao: s.valor_padrao_pagamento,
    chavePixPadrao: s.chave_pix,
    chavePixTipoPadrao: s.chave_pix_tipo,
    funcaoCadastro: funcaoCadastroStaff(s) ?? "",
  }));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="jogoId" value={jogoId} />

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Recibos salvos com sucesso.</p>
      ) : null}
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      {pessoas.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Ninguém foi convocado ainda para este jogo. Monte a convocação primeiro.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Função no jogo</th>
                <th className="py-2 pr-3">Valor (R$)</th>
                <th className="py-2 pr-3">Tipo da chave</th>
                <th className="py-2 pr-3">Chave PIX</th>
                <th className="py-2">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pessoas.map((p) => {
                const atual = reciboDe(p.tipo, p.id);
                const valorInicial = atual?.valor ?? p.valorPadrao ?? "";
                const chavePixInicial = atual?.chave_pix ?? p.chavePixPadrao ?? "";
                return (
                  <ReciboLinha
                    key={`${p.tipo}-${p.id}`}
                    pessoaTipo={p.tipo}
                    pessoaId={p.id}
                    nome={p.nome}
                    extra={p.extra}
                    funcaoJogoDefault={atual?.funcao_jogo ?? p.funcaoCadastro}
                    valorDefault={valorInicial}
                    chavePixDefault={chavePixInicial ?? ""}
                    chavePixTipoDefault={atual?.chave_pix_tipo ?? p.chavePixTipoPadrao ?? ""}
                    pagoDefault={atual?.pago ?? false}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SubmitButton label="Salvar recibos" />
    </form>
  );
}
