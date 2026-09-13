"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { assinarDocumento, type AssinarState } from "@/lib/assinaturas/actions";
import type { TipoDocumento, PapelEsperado } from "@/lib/assinaturas/config";
import type { AssinaturaComImagem } from "@/lib/assinaturas/actions";

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const estadoInicial: AssinarState = {};

/**
 * Botão "Assinar" — desde a assinatura desenhada/anexada (ver docs/superpowers/specs/2026-09-13-
 * assinatura-desenhada-design.md), clicar já aplica a assinatura salva da própria conta na hora,
 * sem senha nem confirmação extra (a trava de quem pode clicar, `papeisQuePossoAssinar`, já garante
 * que é a pessoa certa). Sem assinatura cadastrada, o botão nem aparece — ver
 * `BlocoAssinaturaDigital` abaixo.
 */
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
  const action = assinarDocumento.bind(null, tipoDocumento, documentoId, papel, caminhoRevalidar);
  const [state, formAction] = useFormState(action, estadoInicial);

  return (
    <form action={formAction} className="mt-2 space-y-1.5">
      {state.error ? <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{state.error}</p> : null}
      <SubmitButton label="Assinar" pendingLabel="Assinando..." className="btn-secondary text-sm" />
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
  minhaAssinaturaCadastrada,
}: {
  tipoDocumento: TipoDocumento;
  documentoId: string;
  caminhoRevalidar: string;
  papeis: PapelEsperado[];
  assinaturas: AssinaturaComImagem[];
  papeisQuePossoAssinar: string[];
  /** Se a conta logada já tem assinatura cadastrada em `/minha-conta` (ver docs/superpowers/specs/
   * 2026-09-13-assinatura-desenhada-design.md) — sem isso, o botão "Assinar" nem aparece pra quem
   * teria permissão de assinar, evita clicar e só então descobrir o bloqueio. */
  minhaAssinaturaCadastrada: boolean;
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
                <>
                  {assinatura.assinaturaImagemSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assinatura.assinaturaImagemSrc} alt="" className="mt-1 h-10 object-contain" />
                  ) : null}
                  <p className="text-emerald-700">
                    Assinado digitalmente por {assinatura.nomeNoMomento}
                    {assinatura.cargoNoMomento ? `, ${assinatura.cargoNoMomento}` : ""}, em{" "}
                    {formatarDataHora(assinatura.assinadoEm)}.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-neutral-400">Pendente de assinatura.</p>
                  {papeisQuePossoAssinar.includes(p.papel) ? (
                    minhaAssinaturaCadastrada ? (
                      <FormularioAssinar
                        tipoDocumento={tipoDocumento}
                        documentoId={documentoId}
                        papel={p.papel}
                        caminhoRevalidar={caminhoRevalidar}
                      />
                    ) : (
                      <p className="mt-1 text-xs text-amber-700">
                        <Link href="/minha-conta" className="underline">
                          Cadastre sua assinatura em Minha Conta
                        </Link>{" "}
                        antes de assinar.
                      </p>
                    )
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
