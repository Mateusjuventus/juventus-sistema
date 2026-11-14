"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SelectField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { ModalShell } from "@/components/programacao/modal";
import { CATEGORIAS_ATLETA, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { transitarCategoriaAtleta, type TransitarCategoriaFormState } from "@/app/atletas/actions";

const initialState: TransitarCategoriaFormState = {};

/**
 * Botão "Transitar atleta" (ver docs/superpowers/specs/2026-11-04-atletas-desativacao-transicao-
 * pagamento-design.md) — troca a categoria de qualquer atleta (Base ou Profissional), inclusive
 * promovendo/rebaixando pro Profissional. Só renderizado pela página quando
 * `getPodeTransitarCategoriaAtleta` é `true` (checagem real continua no servidor, na própria
 * action — isto aqui só evita mostrar o botão pra quem não precisa). Sem motivo, sem histórico.
 * Em modal (`ModalShell`) desde 09/11/2026 — mesmo motivo/pedido de `AtletaAtivoButton`.
 *
 * `isMaster` (desde 14/11/2026) tira do dropdown as categorias do lado oposto da fronteira
 * Base/Profissional pra quem não é master — a troca em si já seria barrada no servidor
 * (`cruzaFronteiraBaseProfissional` em lib/auth/role.ts), isto aqui só evita oferecer uma opção
 * que vai dar erro. Não existe (nem vai existir) um perfil "Gerente do Profissional".
 */
export function TransitarCategoriaForm({
  atletaId,
  categoriaAtual,
  isMaster,
}: {
  atletaId: string;
  categoriaAtual: string;
  isMaster: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction] = useFormState(transitarCategoriaAtleta, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error) setAberto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const categoriaAtualEhBase = ehCategoriaBaseValida(categoriaAtual);
  const opcoes = CATEGORIAS_ATLETA.filter((cat) => cat.value !== categoriaAtual).filter(
    (cat) => isMaster || ehCategoriaBaseValida(cat.value) === categoriaAtualEhBase,
  );

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        Transitar atleta
      </button>

      {aberto ? (
        <ModalShell titulo="Transitar atleta" onClose={() => setAberto(false)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="atletaId" value={atletaId} />
            <SelectField label="Nova categoria" name="novaCategoria" required>
              <option value="">Selecione</option>
              {opcoes.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </SelectField>
            {!isMaster ? (
              <p className="text-xs text-neutral-400">
                Pra transitar entre o Futebol de Base e o Profissional, peça pro Master.
              </p>
            ) : null}
            {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
            <div className="flex justify-end gap-2 border-t border-linha pt-4">
              <button type="button" onClick={() => setAberto(false)} className="btn-secondary">
                Cancelar
              </button>
              <SubmitButton label="Confirmar" pendingLabel="Salvando..." />
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
