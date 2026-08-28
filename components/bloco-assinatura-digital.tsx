"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { assinarDocumento, type AssinarState } from "@/lib/assinaturas/actions";
import type { TipoDocumento, PapelEsperado } from "@/lib/assinaturas/config";
import type { AssinaturaResumo } from "@/lib/assinaturas/actions";

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const estadoInicial: AssinarState = {};

function FormularioAssinar({
  tipoDocumento,
  documentoId,
  papel,
  caminhoRevalidar,
}: {
  tipoDocumento: TipoDocumento;
  documentoId: string;
  papel: string;
  caminhoRevalidar: string;
}) {
  const [aberto, setAberto] = useState(false);
  const action = assinarDocumento.bind(null, tipoDocumento, documentoId, papel, caminhoRevalidar);
  const [state, formAction] = useFormState(action, estadoInicial);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary text-sm">
        Assinar
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-md border border-linha bg-white p-3">
      <label className="flex items-start gap-2 text-xs text-neutral-600">
        <input type="checkbox" required className="mt-0.5" />
        Revisei o documento e confirmo que os dados estão corretos.
      </label>
      <input
        type="password"
        name="senha"
        required
        placeholder="Confirme sua senha"
        className="field-input"
        autoComplete="current-password"
      />
      {state.error ? <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{state.error}</p> : null}
      <div className="flex gap-2">
        <SubmitButton label="Confirmar assinatura" pendingLabel="Assinando..." />
        <button type="button" onClick={() => setAberto(false)} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Bloco de assinatura digital (ver docs/superpowers/specs/2026-08-28-assinatura-digital-
 * notificacoes-design.md) — mostra, papel por papel, quem já assinou (nome + cargo + data/hora) e
 * quem falta; só oferece o botão "Assinar" pra quem tem permissão de assinar aquele papel
 * específico E ainda não assinou. Reaproveitado em todo documento com assinatura digital — a lista
 * de papéis sempre vem de `lib/assinaturas/config.ts`, nunca inventada aqui.
 */
export function BlocoAssinaturaDigital({
  tipoDocumento,
  documentoId,
  caminhoRevalidar,
  papeis,
  assinaturas,
  papeisQuePossoAssinar,
}: {
  tipoDocumento: TipoDocumento;
  documentoId: string;
  caminhoRevalidar: string;
  papeis: PapelEsperado[];
  assinaturas: AssinaturaResumo[];
  papeisQuePossoAssinar: string[];
}) {
  return (
    <div className="rounded-md border border-linha p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Assinaturas</p>
      <div className="space-y-3">
        {papeis.map((p) => {
          const assinatura = assinaturas.find((a) => a.papel === p.papel);
          return (
            <div key={p.papel} className="text-sm">
              <p className="font-medium text-grena-escuro">{p.rotulo}</p>
              {assinatura ? (
                <p className="text-emerald-700">
                  Assinado digitalmente por {assinatura.nomeNoMomento}
                  {assinatura.cargoNoMomento ? `, ${assinatura.cargoNoMomento}` : ""}, em{" "}
                  {formatarDataHora(assinatura.assinadoEm)}.
                </p>
              ) : (
                <>
                  <p className="text-neutral-400">Pendente de assinatura.</p>
                  {papeisQuePossoAssinar.includes(p.papel) ? (
                    <FormularioAssinar
                      tipoDocumento={tipoDocumento}
                      documentoId={documentoId}
                      papel={p.papel}
                      caminhoRevalidar={caminhoRevalidar}
                    />
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
