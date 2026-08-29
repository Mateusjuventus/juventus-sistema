"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { PerfilParaSelecao } from "@/lib/auth/perfis";
import type { AssinaturasParecerState } from "./actions";

const initialState: AssinaturasParecerState = {};

interface LinhaAssinatura {
  /** Chave React local (index da renderização) — não confundir com `assinaturaId`, o id ESTÁVEL
   * gravado no banco (`assinaturas_documento.papel` quando essa linha assina digitalmente). */
  id: number;
  /** Id estável da linha, se já existia salva — vazio numa linha nova, o servidor gera um ao
   * salvar (ver `atualizarAssinaturasParecer`). */
  assinaturaId: string;
  nome: string;
  cargo: string;
  usuarioId: string;
  /** Ver `AssinaturaCaptacao.ehTreinador` em lib/supabase/types.ts. Estado controlado (diferente
   * dos outros campos, uncontrolled) porque um checkbox desmarcado some do FormData — precisa de
   * um hidden ao lado sempre mandando "true"/"false" pra manter as listas paralelas alinhadas. */
  ehTreinador: boolean;
}

/**
 * Configuração das assinaturas do Parecer Final de Avaliação — lista que cresce (não um número
 * fixo de campos, diferente das 2 assinaturas fixas do Financeiro), porque o Mateus pediu "3 e se
 * precisar adiciono mais". Mesmo espírito de `CriteriosDesempateField`
 * (app/competicoes/criterios-desempate-field.tsx): estado local só pra controlar quantas linhas
 * aparecem — o valor de cada campo em si é uncontrolled (`defaultValue`), só lido do FormData no
 * momento de salvar. Só visível pro staff (Mateus), dentro de `/base/captacao` — o Treinador nunca
 * vê esta tela.
 *
 * Cada linha pode ser vinculada a um usuário do sistema (ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md, Fase 2) — só essa pessoa consegue assinar
 * digitalmente aquele papel; sem vínculo, qualquer master pode.
 */
export function AssinaturasConfigForm({
  id,
  assinaturasIniciais,
  perfis,
  action,
}: {
  id: string;
  assinaturasIniciais: { id: string; nome: string; cargo: string; usuarioId?: string | null; ehTreinador?: boolean }[];
  perfis: PerfilParaSelecao[];
  action: (prevState: AssinaturasParecerState, formData: FormData) => Promise<AssinaturasParecerState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const proximoId = useRef(0);
  const [linhas, setLinhas] = useState<LinhaAssinatura[]>(() =>
    (
      assinaturasIniciais.length > 0
        ? assinaturasIniciais
        : [{ id: "", nome: "", cargo: "", usuarioId: "", ehTreinador: false }]
    ).map((a) => ({
      id: proximoId.current++,
      assinaturaId: a.id,
      nome: a.nome,
      cargo: a.cargo,
      usuarioId: a.usuarioId ?? "",
      ehTreinador: a.ehTreinador ?? false,
    })),
  );

  function adicionar() {
    setLinhas((atual) => [
      ...atual,
      { id: proximoId.current++, assinaturaId: "", nome: "", cargo: "", usuarioId: "", ehTreinador: false },
    ]);
  }

  function alternarEhTreinador(rowId: number, valor: boolean) {
    setLinhas((atual) => atual.map((l) => (l.id === rowId ? { ...l, ehTreinador: valor } : l)));
  }

  function remover(rowId: number) {
    setLinhas((atual) => atual.filter((l) => l.id !== rowId));
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-neutral-400">Aparecem em todo Parecer Final gerado, na ordem abaixo.</p>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhuma assinatura configurada.</p>
      ) : (
        <div className="space-y-2">
          {linhas.map((linha) => (
            <div key={linha.id} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="assinaturaId" value={linha.assinaturaId} />
              <div className="min-w-[180px] flex-1">
                <label htmlFor={`assinaturaNome-${linha.id}`} className="field-label">
                  Nome
                </label>
                <input
                  id={`assinaturaNome-${linha.id}`}
                  name="assinaturaNome"
                  defaultValue={linha.nome}
                  className="field-input"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label htmlFor={`assinaturaCargo-${linha.id}`} className="field-label">
                  Cargo
                </label>
                <input
                  id={`assinaturaCargo-${linha.id}`}
                  name="assinaturaCargo"
                  defaultValue={linha.cargo}
                  className="field-input"
                />
              </div>
              {linha.ehTreinador ? (
                <input type="hidden" name="assinaturaUsuarioId" value="" />
              ) : (
                <div className="min-w-[200px] flex-1">
                  <label htmlFor={`assinaturaUsuarioId-${linha.id}`} className="field-label">
                    Usuário que assina digitalmente
                  </label>
                  <select
                    id={`assinaturaUsuarioId-${linha.id}`}
                    name="assinaturaUsuarioId"
                    defaultValue={linha.usuarioId}
                    className="field-input"
                  >
                    <option value="">— Não vincular (qualquer master pode assinar) —</option>
                    {perfis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <input type="hidden" name="assinaturaEhTreinador" value={linha.ehTreinador ? "true" : "false"} />
              <label className="flex items-center gap-1.5 pb-2 text-xs text-neutral-600" title="Em vez de vincular uma pessoa fixa, essa linha assina sozinha com quem realmente enviou o Parecer (o Treinador responsável, na tela dele) — não precisa configurar ninguém.">
                <input
                  type="checkbox"
                  checked={linha.ehTreinador}
                  onChange={(e) => alternarEhTreinador(linha.id, e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                É o Treinador (assina sozinho ao enviar)
              </label>
              <button
                type="button"
                onClick={() => remover(linha.id)}
                className="btn-secondary btn-sm"
                title="Remover"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={adicionar} className="btn-secondary btn-sm">
        + Adicionar assinatura
      </button>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3">
        <SubmitButton label="Salvar assinaturas" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
        {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
