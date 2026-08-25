"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { PhotoField } from "@/components/photo-field";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { ATLETA_POSICAO_OPTIONS } from "@/lib/validation/schemas";
import type { CadastroAtletaPublicoState } from "./actions";

const initialState: CadastroAtletaPublicoState = {};

/**
 * Ficha de Cadastro pública de Atleta (ver app/cadastro-atleta-base/actions.ts) — pra atletas que já
 * são (ou estão entrando) do clube, sem relação nenhuma com a Captação. Cria o cadastro completo
 * direto em Atletas; campos administrativos do clube (número de camisa, tipo de contrato etc.) ficam
 * de fora — isso o Mateus completa depois.
 */
export function AtletaPublicoForm({
  action,
}: {
  action: (prevState: CadastroAtletaPublicoState, formData: FormData) => Promise<CadastroAtletaPublicoState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const [possuiAlergia, setPossuiAlergia] = useState(values.possuiAlergiaMedicamento === "sim");
  const formRef = useRef<HTMLFormElement>(null);

  // Bug reportado em 25/08 ("clica em enviar e não aparece nada"): ficha longa, quem preenche
  // costuma estar rolado lá embaixo perto do botão quando envia — se um campo lá em cima (ex.: CPF
  // inválido) tem erro, a mensagem aparecia só do lado daquele campo, fora da tela, e parecia que
  // nada tinha acontecido. Depois de cada envio malsucedido, rola a tela até o primeiro campo com
  // erro pra pessoa ver na hora o que precisa corrigir (o aviso genérico perto do botão, em
  // `state.error`, cobre o caso de rolagem não funcionar por algum motivo).
  useEffect(() => {
    if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) return;
    const primeiroErro = formRef.current?.querySelector(".field-error");
    primeiroErro?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fieldErrors]);

  if (state.success) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-grena-escuro">Cadastro enviado com sucesso!</p>
        <p className="mt-2 text-sm text-neutral-500">
          Obrigado por preencher a ficha. O Departamento de Futebol de Base já recebeu os dados.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6" encType="multipart/form-data">
      <FormSection title="Dados do atleta">
        <FieldGroup>
          <TextField
            label="Nome completo do atleta"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField
            label="Apelido"
            name="apelido"
            required
            defaultValue={values.apelido}
            error={errors.apelido}
          />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField label="RG" name="rg" required defaultValue={values.rg} error={errors.rg} />
          <CpfField label="CPF" name="cpf" required defaultValue={values.cpf} error={errors.cpf} />
          <TelefoneField
            label="Telefone de contato"
            name="telefone"
            required
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField
            label="Cidade natal"
            name="cidadeNatal"
            required
            defaultValue={values.cidadeNatal}
            error={errors.cidadeNatal}
          />
          <TextField
            label="UF natal"
            name="ufNatal"
            required
            maxLength={2}
            defaultValue={values.ufNatal}
            error={errors.ufNatal}
            placeholder="Ex: SP"
          />
          <div className="sm:col-span-2">
            <PhotoField label="Foto" name="foto" required error={errors.foto} />
          </div>
          <div className="sm:col-span-2">
            <SelectField
              label="Possui alergia a algum medicamento?"
              name="possuiAlergiaMedicamento"
              required
              defaultValue={values.possuiAlergiaMedicamento}
              error={errors.possuiAlergiaMedicamento}
              onChange={(value) => setPossuiAlergia(value === "sim")}
            >
              <option value="">Selecione</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </SelectField>
          </div>
          {possuiAlergia ? (
            <div className="sm:col-span-2">
              <TextField
                label="Qual"
                name="alergiaMedicamentoQual"
                required
                defaultValue={values.alergiaMedicamentoQual}
                error={errors.alergiaMedicamentoQual}
              />
            </div>
          ) : null}
        </FieldGroup>
      </FormSection>

      <FormSection title="Dados esportivos">
        <FieldGroup>
          <SelectField label="Categoria" name="categoria" required defaultValue={values.categoria} error={errors.categoria}>
            <option value="">Selecione</option>
            {CATEGORIAS_BASE.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Posição"
            name="posicao"
            required
            defaultValue={values.posicao}
            error={errors.posicao}
          >
            <option value="">Selecione</option>
            {ATLETA_POSICAO_OPTIONS.map((posicao) => (
              <option key={posicao} value={posicao}>
                {posicao}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Pé dominante"
            name="peDominante"
            required
            defaultValue={values.peDominante}
            error={errors.peDominante}
          >
            <option value="">Selecione</option>
            <option value="destro">Destro</option>
            <option value="canhoto">Canhoto</option>
            <option value="ambidestro">Ambidestro</option>
          </SelectField>
          <TextField
            label="Escola"
            name="escola"
            required
            defaultValue={values.escola}
            error={errors.escola}
          />
          <TextField
            label="Data de início no clube"
            name="dataInicioClube"
            type="date"
            required
            defaultValue={values.dataInicioClube}
            error={errors.dataInicioClube}
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="alojado"
              name="alojado"
              type="checkbox"
              defaultChecked={values.alojado === "on"}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <label htmlFor="alojado" className="text-sm font-medium text-neutral-700">
              Mora (ou vai morar) no alojamento do clube
            </label>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Responsáveis">
        <FieldGroup>
          <TextField
            label="Nome da mãe"
            name="maeNome"
            required
            defaultValue={values.maeNome}
            error={errors.maeNome}
          />
          <TelefoneField
            label="Telefone da mãe"
            name="maeTelefone"
            required
            defaultValue={values.maeTelefone}
            error={errors.maeTelefone}
          />
          <TextField
            label="Nome do pai"
            name="paiNome"
            required
            defaultValue={values.paiNome}
            error={errors.paiNome}
          />
          <TelefoneField
            label="Telefone do pai"
            name="paiTelefone"
            required
            defaultValue={values.paiTelefone}
            error={errors.paiTelefone}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Empresário/representante">
        <p className="mb-3 text-sm text-neutral-500">
          Se o atleta não tem empresário/representante, preencha os campos abaixo com &quot;Não
          possui&quot;.
        </p>
        <FieldGroup>
          <TextField
            label="Nome do empresário"
            name="empresarioNome"
            required
            defaultValue={values.empresarioNome}
            error={errors.empresarioNome}
          />
          <TextField
            label="Telefone do empresário"
            name="empresarioTelefone"
            required
            defaultValue={values.empresarioTelefone}
            error={errors.empresarioTelefone}
          />
          <TextField
            label="Agência"
            name="agencia"
            required
            defaultValue={values.agencia}
            error={errors.agencia}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Endereço">
        <EnderecoFields
          required
          defaultValues={{
            cep: values.cep,
            logradouro: values.logradouro,
            numero: values.numero,
            complemento: values.complemento,
            bairro: values.bairro,
            cidade: values.cidade,
            uf: values.uf,
          }}
          errors={{
            cep: errors.cep,
            logradouro: errors.logradouro,
            numero: errors.numero,
            complemento: errors.complemento,
            bairro: errors.bairro,
            cidade: errors.cidade,
            uf: errors.uf,
          }}
        />
      </FormSection>

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <SubmitButton label="Enviar ficha de cadastro" pendingLabel="Enviando..." />
    </form>
  );
}
