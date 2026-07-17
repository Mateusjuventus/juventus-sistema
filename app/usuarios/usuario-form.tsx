"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { MODULOS } from "@/lib/auth/modulos";
import { DEPARTAMENTOS } from "@/lib/auth/departamentos";
import { TAREFA_CATEGORIAS, ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import { criarUsuario, type UsuarioFormState } from "./actions";

const initialState: UsuarioFormState = {};

const CHECKBOX_CLASS = "h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena";

export function UsuarioForm() {
  const [state, formAction] = useFormState(criarUsuario, initialState);
  const [role, setRole] = useState(initialState.values?.role ?? "regular");
  const [modulosMarcados, setModulosMarcados] = useState<string[]>(MODULOS.map((m) => m.chave));
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  function alternarModulo(chave: string, marcado: boolean) {
    setModulosMarcados((atual) => (marcado ? [...atual, chave] : atual.filter((c) => c !== chave)));
  }

  return (
    <form action={formAction} className="space-y-4" autoComplete="off">
      <FormSection title="Novo usuário">
        <p className="-mt-1 text-sm text-neutral-500">
          Cadastre o e-mail e uma senha provisória, e passe pra pessoa por fora do sistema (ela
          consegue trocar a senha depois de entrar).
        </p>
        <FieldGroup>
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={values.email}
            error={errors.email}
            required
            autoComplete="off"
            placeholder="pessoa@exemplo.com"
          />
          <TextField
            label="Senha provisória"
            name="senha"
            type="text"
            error={errors.senha}
            required
            autoComplete="off"
            placeholder="Mínimo 6 caracteres"
          />
          <SelectField
            label="Papel"
            name="role"
            defaultValue={values.role ?? "regular"}
            onChange={(value) => setRole(value)}
          >
            <option value="regular">Regular</option>
            <option value="master">Master</option>
          </SelectField>
        </FieldGroup>

        <details className="border-t border-neutral-100 pt-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-grena">
            Exibir permissões
          </summary>
          <p className="-mt-0.5 mb-3 text-xs text-neutral-400">
            Por padrão vem tudo liberado. Feche esta seção sem mexer se não quiser restringir nada
            agora — dá pra ajustar depois na tela de Usuários.
          </p>

          <div className="space-y-4">
            {role === "master" ? (
              <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                Papel Master já dá acesso completo a todos os departamentos e módulos — não precisa
                marcar nada abaixo.
              </p>
            ) : (
              <>
                <div>
                  <p className="field-label">Departamentos liberados</p>
                  <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {DEPARTAMENTOS.map((dep) => (
                      <label key={dep.chave} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          name="departamentos"
                          value={dep.chave}
                          defaultChecked
                          className={CHECKBOX_CLASS}
                        />
                        {dep.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="field-label">Módulos liberados (Futebol Profissional)</p>
                  <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MODULOS.map((modulo) => (
                      <label key={modulo.chave} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          name="modulos"
                          value={modulo.chave}
                          defaultChecked
                          onChange={(e) => alternarModulo(modulo.chave, e.target.checked)}
                          className={CHECKBOX_CLASS}
                        />
                        {modulo.label}
                      </label>
                    ))}
                  </div>
                </div>

                {modulosMarcados.includes("estoque") ? (
                  <div className="ml-4 border-l-2 border-neutral-100 pl-4">
                    <p className="field-label">Estoque: ramificações liberadas</p>
                    <p className="-mt-0.5 text-xs text-neutral-400">
                      Desmarque uma se essa pessoa não deve ver aquele estoque (ex.: só Médico).
                    </p>
                    <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ESTOQUE_CATEGORIAS.map((cat) => (
                        <label key={cat.value} className="flex items-center gap-2 text-sm text-neutral-700">
                          <input
                            type="checkbox"
                            name="estoqueCategorias"
                            value={cat.value}
                            defaultChecked
                            className={CHECKBOX_CLASS}
                          />
                          {cat.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div>
              <p className="field-label">Categorias de Tarefas visíveis</p>
              <p className="-mt-0.5 text-xs text-neutral-400">
                Controla só quais abas aparecem pra essa pessoa em &quot;Tarefas&quot; — a lista
                continua compartilhada com todo mundo.
              </p>
              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TAREFA_CATEGORIAS.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      name="tarefasCategorias"
                      value={cat.value}
                      defaultChecked
                      className={CHECKBOX_CLASS}
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </details>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Cadastrar usuário" pendingLabel="Cadastrando..." />
      </div>
    </form>
  );
}
