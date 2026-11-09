"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SelectField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_ATLETA } from "@/lib/auth/categorias-base";
import { transitarCategoriaAtleta, type TransitarCategoriaFormState } from "@/app/atletas/actions";

const initialState: TransitarCategoriaFormState = {};

/**
 * Botão "Transitar atleta" (ver docs/superpowers/specs/2026-11-04-atletas-desativacao-transicao-
 * pagamento-design.md) — troca a categoria de qualquer atleta (Base ou Profissional), inclusive
 * promovendo/rebaixando pro Profissional. Só renderizado pela página quando
 * `getPodeTransitarCategoriaAtleta` é `true` (checagem real continua no servidor, na própria
 * action — isto aqui só evita mostrar o botão pra quem não precisa). Sem motivo, sem histórico.
 */
export function TransitarCategoriaForm({ atletaId, categoriaAtual }: { atletaId: string; categoriaAtual: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction] = useFormState(transitarCategoriaAtleta, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error) setAberto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        Transitar atleta
      </button>
    );
  }

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-3 p-4">
      <input type="hidden" name="atletaId" value={atletaId} />
      <p className="text-sm font-semibold text-grena-escuro">Transitar atleta</p>
      <SelectField label="Nova categoria" name="novaCategoria" required>
        <option value="">Selecione</option>
        {CATEGORIAS_ATLETA.filter((cat) => cat.value !== categoriaAtual).map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </SelectField>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <div className="flex gap-2">
        <SubmitButton label="Confirmar" pendingLabel="Salvando..." className="btn-primary btn-sm" />
        <button type="button" onClick={() => setAberto(false)} className="btn-secondary btn-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
