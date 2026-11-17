"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ModalShell } from "@/components/programacao/modal";
import {
  buscarTextoContratoFormacao,
  atualizarTextoContratoFormacao,
  restaurarTextoPadraoContratoFormacao,
  type TextoContratoFormacaoFormState,
} from "@/app/atletas/[id]/contrato/formacao/actions";

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar texto personalizado"}
    </button>
  );
}

function RestaurarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-danger" disabled={pending}>
      {pending ? "Restaurando..." : "Sim, restaurar"}
    </button>
  );
}

/**
 * Modal "Personalizar texto do contrato", aberto pelo novo botão dentro do modal de Contrato de
 * Formação (`components/contrato-formacao-button.tsx`) — ver docs/superpowers/specs/2026-11-16-
 * contrato-formacao-texto-personalizado-design.md. Dois campos de texto livre: o corpo do Contrato
 * de Formação principal e o das Cláusulas Adicionais. Pré-preenchidos com o texto já personalizado
 * do contrato, se existir, senão com o texto padrão gerado a partir do template (mesmo texto que
 * sairia no PDF hoje) — `buscarTextoContratoFormacao` decide isso. A assinatura (data, JUVENTUS SAF,
 * ATLETA, testemunhas) nunca aparece aqui: no PDF ela é sempre automática, nos dois casos (padrão ou
 * personalizado) — ver `montarBlocos` em `lib/pdf/contrato-formacao-document.tsx`/`contrato-
 * formacao-maior-document.tsx`.
 *
 * "Restaurar texto padrão" usa o mesmo padrão de confirmação em duas etapas de `DeleteButton`
 * (`components/delete-button.tsx`) em vez de `window.confirm` — ao confirmar, limpa os dois campos
 * no banco e recarrega o texto padrão nos dois `<textarea>` (a troca de `key` força o React a
 * remontá-los com o novo `defaultValue`, já que são não controlados).
 */
export function ContratoFormacaoTextoModal({ atletaId, onClose }: { atletaId: string; onClose: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [textoInicial, setTextoInicial] = useState<{
    textoContrato: string;
    textoClausulasAdicionais: string;
  } | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmandoRestaurar, setConfirmandoRestaurar] = useState(false);

  const [stateSalvar, formActionSalvar] = useFormState<TextoContratoFormacaoFormState, FormData>(
    atualizarTextoContratoFormacao,
    {},
  );
  const [stateRestaurar, formActionRestaurar] = useFormState<TextoContratoFormacaoFormState, FormData>(
    restaurarTextoPadraoContratoFormacao,
    {},
  );

  async function carregar() {
    setCarregando(true);
    setErroCarregar(null);
    const resultado = await buscarTextoContratoFormacao(atletaId);
    if ("error" in resultado) {
      setErroCarregar(resultado.error);
    } else {
      setTextoInicial(resultado);
      setVersao((v) => v + 1);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stateRestaurar.success) {
      setConfirmandoRestaurar(false);
      carregar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateRestaurar]);

  return (
    <ModalShell
      titulo="Personalizar texto do contrato"
      subtitulo="Substitui o corpo do contrato gerado pelo modelo — a assinatura continua sempre automática."
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
    >
      {carregando ? (
        <p className="text-sm text-neutral-500">Carregando texto do contrato...</p>
      ) : erroCarregar ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroCarregar}</p>
      ) : textoInicial ? (
        <div className="space-y-4">
          <form action={formActionSalvar} className="space-y-6">
            <input type="hidden" name="atletaId" value={atletaId} />
            <div>
              <label className="field-label" htmlFor="textoContrato">
                Contrato de Formação Desportiva
              </label>
              <textarea
                key={`contrato-${versao}`}
                id="textoContrato"
                name="textoContrato"
                defaultValue={textoInicial.textoContrato}
                rows={14}
                className="mt-1 w-full rounded-md border border-linha px-3 py-2 font-mono text-xs leading-relaxed text-neutral-800"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="textoClausulasAdicionais">
                Cláusulas Adicionais
              </label>
              <textarea
                key={`clausulas-${versao}`}
                id="textoClausulasAdicionais"
                name="textoClausulasAdicionais"
                defaultValue={textoInicial.textoClausulasAdicionais}
                rows={10}
                className="mt-1 w-full rounded-md border border-linha px-3 py-2 font-mono text-xs leading-relaxed text-neutral-800"
              />
            </div>

            {stateSalvar.success ? (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Texto salvo com sucesso.</p>
            ) : null}
            {stateSalvar.error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{stateSalvar.error}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SalvarButton />
              {!confirmandoRestaurar ? (
                <button type="button" className="btn-secondary" onClick={() => setConfirmandoRestaurar(true)}>
                  Restaurar texto padrão
                </button>
              ) : null}
            </div>
          </form>

          {confirmandoRestaurar ? (
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-md bg-amber-50 p-2">
              <span className="text-sm text-amber-800">
                Restaurar o texto padrão? O texto personalizado atual será perdido.
              </span>
              <form action={formActionRestaurar}>
                <input type="hidden" name="atletaId" value={atletaId} />
                <RestaurarButton />
              </form>
              <button type="button" className="btn-secondary" onClick={() => setConfirmandoRestaurar(false)}>
                Cancelar
              </button>
            </div>
          ) : null}
          {stateRestaurar.error ? <p className="text-right text-xs text-red-700">{stateRestaurar.error}</p> : null}
        </div>
      ) : null}
    </ModalShell>
  );
}
