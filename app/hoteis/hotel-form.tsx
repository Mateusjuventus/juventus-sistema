"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/fields";
import { ESTRUTURA_LABEL } from "@/lib/futebol/hotel";
import type { HotelRow } from "@/lib/supabase/types";
import type { HotelFormState } from "./actions";

const initialState: HotelFormState = {};

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-grena" />
      {label}
    </label>
  );
}

/**
 * Cadastro de um hotel. Só o nome é obrigatório — o resto costuma chegar aos poucos (o telefone
 * hoje, o contato do comercial depois da primeira reserva), e travar o salvamento num campo vazio
 * faria o cadastro nunca ser criado.
 */
export function HotelForm({
  hotel,
  action,
  submitLabel,
}: {
  hotel?: HotelRow;
  action: (prevState: HotelFormState, formData: FormData) => Promise<HotelFormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="card mt-6 space-y-6 p-6">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wide text-grena-escuro">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Nome do hotel" name="nome" defaultValue={hotel?.nome} required />
          </div>
          <TextField label="CNPJ" name="cnpj" defaultValue={hotel?.cnpj} placeholder="00.000.000/0000-00" />
          <TextField label="Site" name="site" defaultValue={hotel?.site} placeholder="https://" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-linha pt-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-grena-escuro">Endereço</legend>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <TextField label="Logradouro" name="logradouro" defaultValue={hotel?.logradouro} />
          </div>
          <div className="sm:col-span-2">
            <TextField label="Número" name="numero" defaultValue={hotel?.numero} />
          </div>
          <div className="sm:col-span-3">
            <TextField label="Complemento" name="complemento" defaultValue={hotel?.complemento} />
          </div>
          <div className="sm:col-span-3">
            <TextField label="Bairro" name="bairro" defaultValue={hotel?.bairro} />
          </div>
          <div className="sm:col-span-3">
            <TextField label="Cidade" name="cidade" defaultValue={hotel?.cidade} />
          </div>
          <div className="sm:col-span-1">
            <TextField label="UF" name="uf" defaultValue={hotel?.uf} maxLength={2} placeholder="SP" />
          </div>
          <div className="sm:col-span-2">
            <TextField label="CEP" name="cep" defaultValue={hotel?.cep} placeholder="00000-000" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-linha pt-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-grena-escuro">Contato</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Telefone" name="telefone" defaultValue={hotel?.telefone} />
          <TextField label="WhatsApp" name="whatsapp" defaultValue={hotel?.whatsapp} />
          <TextField label="E-mail" name="email" type="email" defaultValue={hotel?.email} />
          <div />
        </div>
        <p className="text-xs text-neutral-400">
          Abaixo, a pessoa do hotel com quem a reserva é fechada (comercial/eventos) — é o que faz o
          cadastro valer na próxima viagem.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Contato — nome" name="contatoNome" defaultValue={hotel?.contato_nome} />
          <TextField
            label="Contato — função"
            name="contatoFuncao"
            defaultValue={hotel?.contato_funcao}
            placeholder="Ex.: Gerente comercial"
          />
          <TextField label="Contato — telefone" name="contatoTelefone" defaultValue={hotel?.contato_telefone} />
          <TextField label="Contato — e-mail" name="contatoEmail" type="email" defaultValue={hotel?.contato_email} />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-linha pt-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-grena-escuro">
          Hospedagem e estrutura
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Diária de referência"
            name="diariaReferencia"
            type="number"
            step="0.01"
            min={0}
            defaultValue={hotel?.diaria_referencia ?? ""}
            placeholder="opcional"
          />
          <TextField
            label="Check-in padrão"
            name="horarioCheckin"
            defaultValue={hotel?.horario_checkin}
            placeholder="Ex.: 14h"
          />
          <TextField
            label="Check-out padrão"
            name="horarioCheckout"
            defaultValue={hotel?.horario_checkout}
            placeholder="Ex.: 12h"
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox name="cafeIncluso" label={ESTRUTURA_LABEL.cafe_incluso} defaultChecked={hotel?.cafe_incluso} />
          <Checkbox
            name="estacionamentoOnibus"
            label={ESTRUTURA_LABEL.estacionamento_onibus}
            defaultChecked={hotel?.estacionamento_onibus}
          />
          <Checkbox
            name="salaRefeicaoGrupo"
            label={ESTRUTURA_LABEL.sala_refeicao_grupo}
            defaultChecked={hotel?.sala_refeicao_grupo}
          />
        </div>
      </fieldset>

      <div className="border-t border-linha pt-5">
        <label htmlFor="observacoes" className="field-label">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          className="field-input"
          placeholder="Ex.: exige empenho antecipado; quartos de casal só no 4º andar; fica a 10 min do estádio"
          defaultValue={hotel?.observacoes ?? ""}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
