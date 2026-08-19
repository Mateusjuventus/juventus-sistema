"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { CATEGORIA_POSICAO_OPTIONS } from "@/lib/futebol/categoria-posicao";
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
    <form action={formAction} className="space-y-6">
      <FormSection title="Dados do atleta">
        <FieldGroup>
          <TextField
            label="Nome completo do atleta"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField label="Apelido" name="apelido" defaultValue={values.apelido} error={errors.apelido} />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField label="RG" name="rg" defaultValue={values.rg} error={errors.rg} />
          <TextField
            label="CPF"
            name="cpf"
            placeholder="000.000.000-00"
            defaultValue={values.cpf}
            error={errors.cpf}
          />
          <TextField label="Telefone de contato" name="telefone" defaultValue={values.telefone} error={errors.telefone} />
          <TextField
            label="Cidade natal"
            name="cidadeNatal"
            defaultValue={values.cidadeNatal}
            error={errors.cidadeNatal}
          />
          <TextField
            label="UF natal"
            name="ufNatal"
            maxLength={2}
            defaultValue={values.ufNatal}
            error={errors.ufNatal}
            placeholder="Ex: SP"
          />
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
          <TextField
            label="Posição"
            name="posicao"
            required
            defaultValue={values.posicao}
            error={errors.posicao}
            placeholder="Ex: Zagueiro, Atacante"
          />
          <SelectField
            label="Categoria de posição"
            name="categoriaPosicao"
            required
            defaultValue={values.categoriaPosicao}
            error={errors.categoriaPosicao}
          >
            <option value="">Selecione</option>
            {CATEGORIA_POSICAO_OPTIONS.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Escola" name="escola" defaultValue={values.escola} error={errors.escola} />
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
          <TextField label="Nome da mãe" name="maeNome" defaultValue={values.maeNome} error={errors.maeNome} />
          <TextField
            label="Telefone da mãe"
            name="maeTelefone"
            defaultValue={values.maeTelefone}
            error={errors.maeTelefone}
          />
          <TextField label="Nome do pai" name="paiNome" defaultValue={values.paiNome} error={errors.paiNome} />
          <TextField
            label="Telefone do pai"
            name="paiTelefone"
            defaultValue={values.paiTelefone}
            error={errors.paiTelefone}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Empresário/representante (se houver)">
        <FieldGroup>
          <TextField
            label="Nome do empresário"
            name="empresarioNome"
            defaultValue={values.empresarioNome}
            error={errors.empresarioNome}
          />
          <TextField
            label="Telefone do empresário"
            name="empresarioTelefone"
            defaultValue={values.empresarioTelefone}
            error={errors.empresarioTelefone}
          />
          <TextField label="Agência" name="agencia" defaultValue={values.agencia} error={errors.agencia} />
        </FieldGroup>
      </FormSection>

      <FormSection title="Endereço">
        <EnderecoFields
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
