"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { ModalShell } from "@/components/programacao/modal";
import { SelectField, TextAreaField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import {
  FISIOTERAPIA_STATUS_DIA_COR,
  FISIOTERAPIA_STATUS_DIA_LABEL,
  FISIOTERAPIA_STATUS_DIA_OPTIONS,
} from "@/lib/futebol/fisioterapia";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import { CATEGORIAS_BASE, CATEGORIA_BASE_COR } from "@/lib/auth/categorias-base";
import type { CategoriaBase, FisioterapiaAtendimentoBaseRow } from "@/lib/supabase/types";
import { atualizarAtendimentoBase, registrarAtendimentoBase, type FisioterapiaFormStateBase } from "../[atletaId]/actions";
import type { LancamentoDiaAtletaItemBase } from "./page";

const initialState: FisioterapiaFormStateBase = {};

function Feedback({ state }: { state: FisioterapiaFormStateBase }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  return null;
}

/** Espelha `LancamentoForm` (Profissional) — único campo extra é `categoria` oculto, exigido pelas
 * Server Actions `_base` só pra revalidar a página certa (ver `actions.ts`). */
function LancamentoFormBase({
  atletaId,
  categoria,
  data,
  atendimentoExistente,
  lesoesOpcoes,
  onClose,
}: {
  atletaId: string;
  categoria: string;
  data: string;
  atendimentoExistente: FisioterapiaAtendimentoBaseRow | null;
  lesoesOpcoes: { id: string; descricao: string }[];
  onClose: () => void;
}) {
  const action = atendimentoExistente ? atualizarAtendimentoBase : registrarAtendimentoBase;
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="atletaId" value={atletaId} />
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="data" value={data} />
      {atendimentoExistente ? <input type="hidden" name="atendimentoId" value={atendimentoExistente.id} /> : null}
      {lesoesOpcoes.length > 0 ? (
        <SelectField label="Ligar a uma lesão em andamento (opcional)" name="lesaoId" defaultValue={atendimentoExistente?.lesao_id ?? ""}>
          <option value="">Sessão solta (sem lesão vinculada)</option>
          {lesoesOpcoes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.descricao}
            </option>
          ))}
        </SelectField>
      ) : null}
      <SelectField label="Status do dia (opcional)" name="statusDia" defaultValue={atendimentoExistente?.status_dia ?? ""}>
        <option value="">Sem status</option>
        {FISIOTERAPIA_STATUS_DIA_OPTIONS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        label="O que foi feito"
        name="descricao"
        defaultValue={atendimentoExistente?.descricao ?? ""}
        error={state.fieldErrors?.descricao}
        required
        rows={4}
      />
      <Feedback state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary btn-sm">
          Cancelar
        </button>
        <SubmitButton label="Salvar" pendingLabel="Salvando..." className="btn-primary btn-sm" />
      </div>
    </form>
  );
}

/** Espelha `LancamentoDiaCliente` (Profissional), com um filtro de categoria adicional (mesmo
 * padrão de chips já usado em `fisioterapia-listagem-base.tsx`) e a lista "Lançados nessa data"
 * agrupada por categoria em vez de uma lista alfabética única. */
export function LancamentoDiaClienteBase({
  atletas,
  atendimentosHoje,
  data,
  podeEditar,
  categoriasPermitidas,
}: {
  atletas: LancamentoDiaAtletaItemBase[];
  atendimentosHoje: FisioterapiaAtendimentoBaseRow[];
  data: string;
  podeEditar: boolean;
  categoriasPermitidas: CategoriaBase[];
}) {
  const [busca, setBusca] = useState("");
  const [categoriaSel, setCategoriaSel] = useState<CategoriaBase | null>(null);
  const [selecionado, setSelecionado] = useState<LancamentoDiaAtletaItemBase | null>(null);
  const buscaNormalizada = busca.trim().toLowerCase();

  const atendimentoPorAtleta = useMemo(() => new Map(atendimentosHoje.map((a) => [a.atleta_id, a])), [atendimentosHoje]);

  const atletasFiltrados = useMemo(
    () =>
      atletas.filter((a) => {
        const combinaCategoria = !categoriaSel || a.categoria === categoriaSel;
        const combinaBusca =
          !buscaNormalizada || nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada);
        return combinaCategoria && combinaBusca;
      }),
    [atletas, buscaNormalizada, categoriaSel],
  );

  const lancadosPorCategoria = useMemo(() => {
    const comAtendimento = atletas
      .filter((a) => atendimentoPorAtleta.has(a.id))
      .map((a) => ({ atleta: a, atendimento: atendimentoPorAtleta.get(a.id)! }));
    const grupos = new Map<CategoriaBase, typeof comAtendimento>();
    for (const item of comAtendimento) {
      const lista = grupos.get(item.atleta.categoria) ?? [];
      lista.push(item);
      grupos.set(item.atleta.categoria, lista);
    }
    for (const lista of grupos.values()) {
      lista.sort((a, b) =>
        nomeExibido({ apelido: a.atleta.apelido, nome_completo: a.atleta.nome }).localeCompare(
          nomeExibido({ apelido: b.atleta.apelido, nome_completo: b.atleta.nome }),
          "pt-BR",
        ),
      );
    }
    return CATEGORIAS_BASE.filter((cat) => grupos.has(cat.value)).map((cat) => ({ categoria: cat, itens: grupos.get(cat.value)! }));
  }, [atletas, atendimentoPorAtleta]);

  return (
    <div className="space-y-6">
      {podeEditar ? (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Lançar atendimento</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar atleta pelo nome..."
              className="field-input max-w-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_BASE.filter((cat) => categoriasPermitidas.includes(cat.value)).map((cat) => {
                const ativo = categoriaSel === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategoriaSel((atual) => (atual === cat.value ? null : cat.value))}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold transition-colors ${
                      ativo ? "border-grena bg-grena/10 text-grena-escuro" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: CATEGORIA_BASE_COR[cat.value] }} aria-hidden />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {atletasFiltrados.length === 0 ? (
            <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">Nenhum atleta encontrado.</p>
          ) : (
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
              {atletasFiltrados.map((atleta) => (
                <AtletaCard
                  key={atleta.id}
                  atleta={atleta}
                  as="div"
                  mostrarCpf={false}
                  mostrarContrato={false}
                  aoClicarCabecalho={() => setSelecionado(atleta)}
                  indicador={
                    atendimentoPorAtleta.has(atleta.id) ? (
                      <span className="block bg-emerald-50 py-0.5 text-center text-[10px] font-semibold text-emerald-700">
                        ✓ Lançado hoje
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Lançados em {formatDataBr(data)}</h2>
        {lancadosPorCategoria.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhum atendimento lançado nessa data ainda.</p>
        ) : (
          <div className="mt-3 space-y-5">
            {lancadosPorCategoria.map(({ categoria, itens }) => (
              <div key={categoria.value}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: CATEGORIA_BASE_COR[categoria.value] }} aria-hidden />
                  {categoria.label}
                </p>
                <ul className="space-y-3">
                  {itens.map(({ atleta, atendimento }) => (
                    <li key={atleta.id} className="card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-800">
                          {nomeExibido({ apelido: atleta.apelido, nome_completo: atleta.nome })}
                        </p>
                        {atendimento.status_dia ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: FISIOTERAPIA_STATUS_DIA_COR[atendimento.status_dia] }}
                          >
                            {FISIOTERAPIA_STATUS_DIA_LABEL[atendimento.status_dia]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">{atendimento.descricao}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {selecionado ? (
        <ModalShell
          titulo={atendimentoPorAtleta.has(selecionado.id) ? "Editar atendimento do dia" : "Lançar atendimento do dia"}
          subtitulo={`${nomeExibido({ apelido: selecionado.apelido, nome_completo: selecionado.nome })} · ${formatDataBr(data)}`}
          onClose={() => setSelecionado(null)}
        >
          <LancamentoFormBase
            atletaId={selecionado.id}
            categoria={selecionado.categoria}
            data={data}
            atendimentoExistente={atendimentoPorAtleta.get(selecionado.id) ?? null}
            lesoesOpcoes={selecionado.lesoesOpcoes}
            onClose={() => setSelecionado(null)}
          />
        </ModalShell>
      ) : null}
    </div>
  );
}
