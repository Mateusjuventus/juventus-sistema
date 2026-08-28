"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

/**
 * Nome e cargo de exibição — usados nas assinaturas digitais de documentos (Relatório de Dispensa,
 * Parecer Final etc.: "Assinado digitalmente por [nome], [cargo], em [data]"). Sem preencher aqui,
 * a pessoa não consegue assinar nada.
 */
export function NomeCargoForm({
  action,
  nome,
  cargo,
}: {
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
  nome: string | null;
  cargo: string | null;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormSection title="Nome e cargo pra assinatura digital">
        <FieldGroup>
          <TextField label="Nome" name="nome" required defaultValue={nome ?? ""} placeholder="Seu nome completo" />
          <TextField label="Cargo" name="cargo" defaultValue={cargo ?? ""} placeholder="Ex.: Supervisor de Futebol" />
        </FieldGroup>
        <p className="text-xs text-neutral-400">
          Aparece no lugar da linha em branco de assinatura nos documentos que você assinar digitalmente.
        </p>
      </FormSection>

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>
      ) : null}

      <SubmitButton label="Salvar nome e cargo" pendingLabel="Salvando..." />
    </form>
  );
}
