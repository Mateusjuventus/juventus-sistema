"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/fields";
import { chavePessoa, formatPlaca, placaReconhecida, PESSOA_TIPO_LABEL } from "@/lib/futebol/veiculo";
import type { VeiculoPessoaTipo, VeiculoRow } from "@/lib/supabase/types";
import type { VeiculoFormState } from "./actions";

const initialState: VeiculoFormState = {};

export interface PessoaOpcaoVeiculo {
  tipo: VeiculoPessoaTipo;
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
}

/**
 * Cadastro de um veículo. O vínculo com pessoa é um ATALHO, não uma amarra: escolher alguém
 * preenche nome, documento e telefone (que seguem editáveis) e guarda a ligação; deixar em
 * "— não vinculado —" permite cadastrar motorista terceirizado, familiar ou dirigente convidado,
 * que é metade dos casos de liberação de acesso.
 *
 * A placa não é validada de forma bloqueante — só aparece um aviso quando não bate com o padrão
 * antigo (ABC-1234) nem com o Mercosul (ABC1D23).
 */
export function VeiculoForm({
  veiculo,
  pessoas,
  action,
  submitLabel,
}: {
  veiculo?: VeiculoRow;
  pessoas: PessoaOpcaoVeiculo[];
  action: (prevState: VeiculoFormState, formData: FormData) => Promise<VeiculoFormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  const [pessoaChave, setPessoaChave] = useState(
    veiculo?.pessoa_tipo && veiculo.pessoa_id ? chavePessoa(veiculo.pessoa_tipo, veiculo.pessoa_id) : "",
  );
  const [nome, setNome] = useState(veiculo?.nome ?? "");
  const [documento, setDocumento] = useState(veiculo?.documento ?? "");
  const [telefone, setTelefone] = useState(veiculo?.telefone ?? "");
  const [placa, setPlaca] = useState(veiculo ? formatPlaca(veiculo.placa) : "");

  const escolherPessoa = (chave: string) => {
    setPessoaChave(chave);
    const pessoa = pessoas.find((p) => chavePessoa(p.tipo, p.id) === chave);
    if (!pessoa) return;
    setNome(pessoa.nome);
    if (pessoa.documento) setDocumento(pessoa.documento);
    if (pessoa.telefone) setTelefone(pessoa.telefone);
  };

  const avisoPlaca = placa.trim() !== "" && !placaReconhecida(placa);

  const porTipo = (tipo: VeiculoPessoaTipo) => pessoas.filter((p) => p.tipo === tipo);

  return (
    <form action={formAction} className="card mt-6 space-y-5 p-6">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div>
        <label htmlFor="pessoa" className="field-label">
          Pessoa vinculada
        </label>
        <select
          id="pessoa"
          name="pessoa"
          className="field-input"
          value={pessoaChave}
          onChange={(e) => escolherPessoa(e.target.value)}
        >
          <option value="">— não vinculado (digitar o nome abaixo) —</option>
          {(["atleta", "comissao", "staff"] as VeiculoPessoaTipo[]).map((tipo) =>
            porTipo(tipo).length > 0 ? (
              <optgroup key={tipo} label={PESSOA_TIPO_LABEL[tipo]}>
                {porTipo(tipo).map((p) => (
                  <option key={chavePessoa(p.tipo, p.id)} value={chavePessoa(p.tipo, p.id)}>
                    {p.nome}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
        <p className="mt-1 text-xs text-neutral-400">
          Escolher alguém preenche nome, documento e telefone (que continuam editáveis). Deixe sem
          vínculo para motorista terceirizado, familiar ou convidado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nome" className="field-label">
            Nome do condutor<span className="text-red-700"> *</span>
          </label>
          <input
            id="nome"
            name="nome"
            className="field-input"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="documento" className="field-label">
            RG / CPF
          </label>
          <input
            id="documento"
            name="documento"
            className="field-input"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-400">A portaria costuma pedir documento junto da placa.</p>
        </div>
        <div>
          <label htmlFor="telefone" className="field-label">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            className="field-input"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="placa" className="field-label">
            Placa<span className="text-red-700"> *</span>
          </label>
          <input
            id="placa"
            name="placa"
            className="field-input uppercase"
            required
            placeholder="ABC-1234 ou ABC1D23"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            onBlur={(e) => setPlaca(formatPlaca(e.target.value))}
          />
          {avisoPlaca ? (
            <p className="mt-1 text-xs text-amber-700">
              Essa placa não está no padrão ABC-1234 nem no Mercosul (ABC1D23) — dá pra salvar assim
              mesmo, só confira antes de mandar pra liberação.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <TextField label="Marca" name="marca" defaultValue={veiculo?.marca} placeholder="Ex.: Fiat" />
        <TextField label="Modelo" name="modelo" defaultValue={veiculo?.modelo} placeholder="Ex.: Argo" />
        <TextField label="Cor" name="cor" defaultValue={veiculo?.cor} placeholder="Ex.: Prata" />
        <TextField label="Ano" name="ano" type="number" min={1950} defaultValue={veiculo?.ano ?? ""} />
      </div>

      <div>
        <label htmlFor="observacoes" className="field-label">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          className="field-input"
          placeholder="Ex.: carro da esposa; costuma levar mais 2 pessoas"
          defaultValue={veiculo?.observacoes ?? ""}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
