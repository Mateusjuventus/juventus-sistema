"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { TEXTO_PADRAO, TERMO_TIPO_LABEL } from "@/lib/futebol/termo-retirada";
import type { TermoRetiradaItemRow, TermoRetiradaRow, TermoRetiradaTipo } from "@/lib/supabase/types";
import type { TermoFormState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : label}
    </button>
  );
}

interface LinhaItem {
  chave: string;
  descricao: string;
  quantidade: string;
  valor: string;
}

function novaLinha(): LinhaItem {
  return { chave: crypto.randomUUID(), descricao: "", quantidade: "1", valor: "" };
}

/**
 * Formulário do Termo de Retirada. Os itens são digitados livremente (não vêm do catálogo do
 * Estoque — ver a spec), com valor unitário opcional por item; o total aparece na hora, porque é
 * o número que o texto de responsabilidade usa em caso de não devolução.
 *
 * O texto de responsabilidade começa no padrão do tipo escolhido e fica editável: o que estiver
 * aqui é o que vai ser gravado e impresso. Trocar o tipo só reescreve o texto se ele ainda não
 * tiver sido editado à mão — senão o que o usuário escreveu seria perdido num clique.
 */
export function TermoForm({
  termo,
  itensIniciais,
  action,
  submitLabel,
}: {
  termo?: TermoRetiradaRow;
  itensIniciais?: TermoRetiradaItemRow[];
  action: (prevState: TermoFormState, formData: FormData) => Promise<TermoFormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {} as TermoFormState);

  const [tipo, setTipo] = useState<TermoRetiradaTipo>(termo?.tipo ?? "emprestimo");
  const [texto, setTexto] = useState(termo?.texto_responsabilidade ?? TEXTO_PADRAO[termo?.tipo ?? "emprestimo"]);
  const [textoEditado, setTextoEditado] = useState(Boolean(termo));
  const [linhas, setLinhas] = useState<LinhaItem[]>(() =>
    itensIniciais && itensIniciais.length > 0
      ? itensIniciais.map((i) => ({
          chave: i.id,
          descricao: i.descricao,
          quantidade: String(i.quantidade),
          valor: i.valor_unitario === null ? "" : String(i.valor_unitario),
        }))
      : [novaLinha()],
  );

  const trocarTipo = (novo: TermoRetiradaTipo) => {
    setTipo(novo);
    if (!textoEditado) setTexto(TEXTO_PADRAO[novo]);
  };

  const atualizar = (chave: string, campo: keyof Omit<LinhaItem, "chave">, valor: string) => {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  };

  const total = linhas.reduce((soma, l) => {
    const qtd = Number(l.quantidade.replace(",", "."));
    const val = Number(l.valor.replace(",", "."));
    if (!Number.isFinite(qtd) || !Number.isFinite(val) || l.valor.trim() === "") return soma;
    return soma + qtd * val;
  }, 0);

  return (
    <form action={formAction} className="card mt-6 space-y-5 p-6">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tipo" className="field-label">
            Tipo de retirada
          </label>
          <select
            id="tipo"
            name="tipo"
            className="field-input"
            value={tipo}
            onChange={(e) => trocarTipo(e.target.value as TermoRetiradaTipo)}
          >
            {(Object.keys(TERMO_TIPO_LABEL) as TermoRetiradaTipo[]).map((t) => (
              <option key={t} value={t}>
                {TERMO_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="data" className="field-label">
            Data da retirada
          </label>
          <input id="data" name="data" type="date" className="field-input" defaultValue={termo?.data ?? ""} />
        </div>
        <div>
          <label htmlFor="responsavelNome" className="field-label">
            Nome de quem está retirando
          </label>
          <input
            id="responsavelNome"
            name="responsavelNome"
            className="field-input"
            defaultValue={termo?.responsavel_nome ?? ""}
            required
          />
        </div>
        <div>
          <label htmlFor="responsavelDocumento" className="field-label">
            RG / CPF
          </label>
          <input
            id="responsavelDocumento"
            name="responsavelDocumento"
            className="field-input"
            defaultValue={termo?.responsavel_documento ?? ""}
          />
        </div>
        <div>
          <label htmlFor="funcao" className="field-label">
            Função
          </label>
          <input id="funcao" name="funcao" className="field-input" defaultValue={termo?.funcao ?? ""} />
        </div>
        <div>
          <label htmlFor="departamento" className="field-label">
            Departamento
          </label>
          <input
            id="departamento"
            name="departamento"
            className="field-input"
            defaultValue={termo?.departamento ?? ""}
          />
        </div>
        <div className={tipo === "emprestimo" ? "" : "sm:col-span-2"}>
          <label htmlFor="finalidade" className="field-label">
            Finalidade / destino
          </label>
          <input
            id="finalidade"
            name="finalidade"
            className="field-input"
            placeholder="Ex.: jogo fora de casa, manutenção, uso na sede"
            defaultValue={termo?.finalidade ?? ""}
          />
        </div>
        {tipo === "emprestimo" ? (
          <div>
            <label htmlFor="previsaoDevolucao" className="field-label">
              Previsão de devolução
            </label>
            <input
              id="previsaoDevolucao"
              name="previsaoDevolucao"
              type="date"
              className="field-input"
              defaultValue={termo?.previsao_devolucao ?? ""}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Passando dessa data sem devolução, o termo aparece como atrasado na lista.
            </p>
          </div>
        ) : null}
      </div>

      <fieldset className="rounded-md border border-linha p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">Materiais que estão saindo</legend>

        <div className="mt-2 space-y-2">
          {linhas.map((linha, i) => (
            <div key={linha.chave} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                {i === 0 ? <label className="field-label">Descrição</label> : null}
                <input
                  name="itemDescricao"
                  className="field-input"
                  placeholder="Ex.: Notebook Dell, 2 jogos de uniforme, caixa de som"
                  value={linha.descricao}
                  onChange={(e) => atualizar(linha.chave, "descricao", e.target.value)}
                />
              </div>
              <div className="w-24">
                {i === 0 ? <label className="field-label">Qtd.</label> : null}
                <input
                  name="itemQuantidade"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="field-input"
                  value={linha.quantidade}
                  onChange={(e) => atualizar(linha.chave, "quantidade", e.target.value)}
                />
              </div>
              <div className="w-36">
                {i === 0 ? <label className="field-label">Valor sugerido (un.)</label> : null}
                <input
                  name="itemValor"
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  placeholder="opcional"
                  value={linha.valor}
                  onChange={(e) => atualizar(linha.chave, "valor", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setLinhas((atual) => (atual.length > 1 ? atual.filter((l) => l.chave !== linha.chave) : atual))}
                className="mb-1 rounded px-2 py-1 text-sm text-neutral-300 hover:bg-red-50 hover:text-red-600"
                title="Remover item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
            className="btn-secondary text-sm"
          >
            + Adicionar item
          </button>
          <p className="text-sm text-neutral-600">
            Total sugerido:{" "}
            <span className="font-bold text-grena-escuro">
              {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          O valor é opcional item a item — só entra na soma o que estiver preenchido. Estes itens não saem do
          Estoque; para material do catálogo, use Estoque → Saída.
        </p>
      </fieldset>

      <div>
        <label htmlFor="textoResponsabilidade" className="field-label">
          Texto de responsabilidade (impresso no termo)
        </label>
        <textarea
          id="textoResponsabilidade"
          name="textoResponsabilidade"
          rows={8}
          className="field-input"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setTextoEditado(true);
          }}
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-neutral-400">
            Começa no texto padrão do tipo escolhido e fica gravado neste termo — mudar o padrão depois não
            altera documentos já assinados.
          </p>
          <button
            type="button"
            onClick={() => {
              setTexto(TEXTO_PADRAO[tipo]);
              setTextoEditado(false);
            }}
            className="text-xs font-medium text-grena hover:underline"
          >
            Restaurar texto padrão
          </button>
        </div>
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
          defaultValue={termo?.observacoes ?? ""}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
