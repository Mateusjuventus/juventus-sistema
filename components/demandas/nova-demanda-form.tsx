"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { criarDemanda, type DemandaFormState } from "@/app/minhas-demandas/actions";

const initialState: DemandaFormState = {};

export interface PessoaParaAtribuir {
  id: string;
  nome: string;
}

/**
 * Formulário de criar demanda, reaproveitado em três lugares (ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 2): a tela cheia `/minhas-demandas`
 * (completo, com descrição), o painel flutuante (`compacta`, só título + prazo — "precisa ser algo
 * fácil que sempre fica à vista dela", pedido do Mateus) e, dentro do painel flutuante só pro
 * master, o seletor "Para quem?" (`pessoas`, pedido do Mateus em 05/10: "eu como master posso
 * colocar demanda pra eles também") — some quando a lista vem vazia/ausente, e quando aparece o
 * padrão é sempre "Eu mesmo" (nunca pré-seleciona outra pessoa sem querer). Limpa os campos sozinho
 * depois de salvar (sem navegar pra lugar nenhum — `criarDemanda` não redireciona de propósito).
 */
export function NovaDemandaForm({
  compacta = false,
  pessoas,
}: {
  compacta?: boolean;
  /** Só o master recebe isso preenchido — ver `DemandasFlutuantePainel`. */
  pessoas?: PessoaParaAtribuir[];
}) {
  const [state, formAction] = useFormState(criarDemanda, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  if (compacta) {
    return (
      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <input
            name="titulo"
            placeholder="Nova demanda..."
            required
            className="field-input"
            aria-label="Título da nova demanda"
          />
          {state.fieldErrors?.titulo ? <p className="field-error">{state.fieldErrors.titulo}</p> : null}
        </div>
        <input type="date" name="prazo" className="field-input w-auto" aria-label="Prazo (opcional)" />
        {pessoas && pessoas.length > 0 ? (
          <select name="responsavelId" defaultValue="" className="field-input w-auto" aria-label="Para quem">
            <option value="">Eu mesmo</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        ) : null}
        <SubmitButton label="Adicionar" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.error ? <p className="field-error w-full">{state.error}</p> : null}
      </form>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="card space-y-3 p-4">
      <TextField label="Título" name="titulo" error={state.fieldErrors?.titulo} required />
      <TextAreaField label="Descrição (opcional)" name="descricao" error={state.fieldErrors?.descricao} rows={2} />
      <TextField label="Prazo (opcional)" name="prazo" type="date" error={state.fieldErrors?.prazo} />
      {state.error ? <p className="field-error">{state.error}</p> : null}
      <SubmitButton label="Adicionar demanda" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
    </form>
  );
}
