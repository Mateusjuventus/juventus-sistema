"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { CurrencyField } from "@/components/currency-field";
import { SubmitButton } from "@/components/submit-button";
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { ComissaoPublicoBaseForm } from "./comissao-publico-base-form";
import {
  cadastrarComissaoTecnicaBasePublico,
  verificarCpfComissaoTecnicaBasePublico,
  confirmarIdentidadeComissaoTecnicaBasePublico,
  completarCadastroComissaoTecnicaBasePublico,
  type VerificarCpfComissaoTecnicaBaseState,
  type ConfirmarIdentidadeComissaoTecnicaBaseState,
  type CompletarCadastroComissaoTecnicaBaseState,
} from "./actions";

const verificarInitial: VerificarCpfComissaoTecnicaBaseState = {};
const confirmarInitial: ConfirmarIdentidadeComissaoTecnicaBaseState = {};
const completarInitial: CompletarCadastroComissaoTecnicaBaseState = {};

type Etapa = "cpf" | "novo" | "confirmar" | "completar" | "concluido";

/** Espelha `app/cadastro-comissao-tecnica/completar-ou-cadastrar.tsx` (Profissional), olhando
 * `comissao_tecnica_base`. Ver docs/superpowers/specs/2026-08-26-comissao-tecnica-completar-cadastro-design.md. */
export function CompletarOuCadastrarComissaoTecnicaBase() {
  const [etapa, setEtapa] = useState<Etapa>("cpf");
  const [verificarState, verificarAction] = useFormState(
    verificarCpfComissaoTecnicaBasePublico,
    verificarInitial,
  );
  const [confirmarState, confirmarAction] = useFormState(
    confirmarIdentidadeComissaoTecnicaBasePublico,
    confirmarInitial,
  );
  const [completarState, completarAction] = useFormState(
    completarCadastroComissaoTecnicaBasePublico,
    completarInitial,
  );

  useEffect(() => {
    if (verificarState.resultado === "novo") setEtapa("novo");
    else if (verificarState.resultado === "existente") setEtapa("confirmar");
  }, [verificarState.resultado]);

  useEffect(() => {
    if (!confirmarState.confirmado || !confirmarState.faltando) return;
    const { tipoContrato, dataInicio, valorSalario } = confirmarState.faltando;
    setEtapa(tipoContrato || dataInicio || valorSalario ? "completar" : "concluido");
  }, [confirmarState.confirmado, confirmarState.faltando]);

  useEffect(() => {
    if (completarState.success) setEtapa("concluido");
  }, [completarState.success]);

  if (etapa === "novo") {
    return (
      <ComissaoPublicoBaseForm action={cadastrarComissaoTecnicaBasePublico} cpfInicial={verificarState.cpf} />
    );
  }

  if (etapa === "concluido") {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-grena-escuro">
          {completarState.success ? "Cadastro atualizado com sucesso!" : "Seu cadastro já está completo."}
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          {completarState.success
            ? "Obrigado por completar seus dados."
            : "Não há nenhuma informação pendente no seu cadastro."}
        </p>
      </div>
    );
  }

  if (etapa === "confirmar") {
    return (
      <form action={confirmarAction} className="space-y-6">
        <input type="hidden" name="cpf" value={verificarState.cpf ?? ""} />
        <FormSection title="Confirme sua identidade">
          <FieldGroup>
            <TextField label="Data de nascimento" name="dataNascimento" type="date" required />
          </FieldGroup>
          <p className="text-xs text-neutral-400">
            Encontramos um cadastro com esse CPF — confirme sua data de nascimento pra continuar.
          </p>
        </FormSection>
        {confirmarState.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{confirmarState.error}</p>
        ) : null}
        <div className="flex gap-3">
          <SubmitButton label="Continuar" />
        </div>
      </form>
    );
  }

  if (etapa === "completar" && confirmarState.faltando) {
    const { tipoContrato, dataInicio, valorSalario } = confirmarState.faltando;
    return (
      <form action={completarAction} className="space-y-6">
        <input type="hidden" name="cpf" value={confirmarState.cpf ?? ""} />
        <input type="hidden" name="dataNascimento" value={confirmarState.dataNascimento ?? ""} />
        <FormSection title="Complete seu cadastro">
          <FieldGroup>
            {tipoContrato ? (
              <SelectField
                label="Tipo de contrato"
                name="tipoContrato"
                required
                error={completarState.fieldErrors?.tipoContrato}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            ) : null}
            {valorSalario ? (
              <CurrencyField
                label="Salário mensal"
                name="valorSalario"
                required
                error={completarState.fieldErrors?.valorSalario}
              />
            ) : null}
            {dataInicio ? (
              <TextField
                label="Quando iniciou"
                name="dataInicio"
                type="date"
                required
                error={completarState.fieldErrors?.dataInicio}
              />
            ) : null}
          </FieldGroup>
        </FormSection>
        {completarState.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{completarState.error}</p>
        ) : null}
        <div className="flex gap-3">
          <SubmitButton label="Salvar" />
        </div>
      </form>
    );
  }

  return (
    <form action={verificarAction} className="space-y-6">
      <FormSection title="Antes de começar">
        <FieldGroup>
          <CpfField label="CPF" name="cpf" required defaultValue={verificarState.cpf} error={verificarState.fieldErrors?.cpf} />
        </FieldGroup>
        <p className="text-xs text-neutral-400">
          Se você já se cadastrou antes, usamos o CPF pra saber se falta completar alguma informação.
        </p>
      </FormSection>
      {verificarState.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{verificarState.error}</p>
      ) : null}
      <div className="flex gap-3">
        <SubmitButton label="Continuar" />
      </div>
    </form>
  );
}
