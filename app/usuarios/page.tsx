import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { MODULOS } from "@/lib/auth/modulos";
import { DEPARTAMENTOS } from "@/lib/auth/departamentos";
import { ESTOQUE_CATEGORIAS, TAREFA_CATEGORIAS } from "@/lib/validation/schemas";
import type { PerfilRow } from "@/lib/supabase/types";
import {
  atualizarCategoriasTarefas,
  atualizarDepartamentos,
  atualizarEstoqueCategorias,
  atualizarModulos,
  atualizarPapel,
  redefinirSenha,
} from "./actions";
import { PermissaoCheckboxesForm } from "@/components/permissao-checkboxes-form";
import { RedefinirSenhaForm } from "@/components/redefinir-senha-form";
import { UsuarioForm } from "./usuario-form";

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default async function UsuariosPage() {
  const supabase = createClient();
  const master = await isMaster(supabase);
  if (!master) redirect("/profissional");

  const {
    data: { user: usuarioAtual },
  } = await supabase.auth.getUser();

  const { data } = await supabase.from("perfis").select("*").order("created_at", { ascending: true });
  const perfis = (data ?? []) as PerfilRow[];

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Usuários" />
      <p className="-mt-4 text-center text-sm text-neutral-500">
        Só quem é <strong>master</strong> pode excluir Entrada/Saída do Estoque e acessar esta tela.
      </p>

      <div className="mt-6">
        <UsuarioForm />
      </div>

      <div className="mt-6 space-y-4">
        {perfis.map((perfil) => {
          const ehVocaMesmo = perfil.id === usuarioAtual?.id;
          const modulosPermitidos = perfil.modulos_permitidos ?? [];
          const departamentosPermitidos = perfil.departamentos_permitidos ?? [];
          const categoriasTarefasVisiveis = perfil.tarefas_categorias_visiveis ?? [];
          const estoqueCategoriasPermitidas = perfil.estoque_categorias_permitidas ?? [];
          return (
            <div key={perfil.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-800">
                    {perfil.email}
                    {ehVocaMesmo ? <span className="ml-2 text-xs text-neutral-400">(você)</span> : null}
                  </p>
                  <p className="text-xs text-neutral-400">Desde {formatDataHora(perfil.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      perfil.role === "master"
                        ? "bg-dourado/20 text-grena-escuro"
                        : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {perfil.role === "master" ? "Master" : "Regular"}
                  </span>
                  {ehVocaMesmo ? null : (
                    <form action={atualizarPapel}>
                      <input type="hidden" name="id" value={perfil.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={perfil.role === "master" ? "regular" : "master"}
                      />
                      <button type="submit" className="btn-secondary btn-sm">
                        {perfil.role === "master" ? "Tornar regular" : "Tornar master"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <details className="border-t border-neutral-100 pt-3">
                <summary className="cursor-pointer select-none text-sm font-medium text-grena">
                  Redefinir senha
                </summary>
                <p className="-mt-0.5 mb-2 mt-2 text-xs text-neutral-400">
                  Pra quando essa pessoa perde ou esquece a senha — defina uma nova provisória
                  aqui e repasse pra ela por fora do sistema (WhatsApp etc.).
                </p>
                <RedefinirSenhaForm id={perfil.id} action={redefinirSenha} />
              </details>

              <details className="border-t border-neutral-100 pt-3">
                <summary className="cursor-pointer select-none text-sm font-medium text-grena">
                  Exibir permissões
                </summary>

                <div className="mt-3 space-y-3">
                  {perfil.role === "master" ? (
                    <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                      Acesso completo a todos os departamentos e módulos (papel Master).
                    </p>
                  ) : (
                    <>
                      <PermissaoCheckboxesForm
                        id={perfil.id}
                        fieldName="departamentos"
                        titulo="Departamentos liberados"
                        opcoes={DEPARTAMENTOS.map((d) => ({ value: d.chave, label: d.label }))}
                        valoresIniciais={departamentosPermitidos}
                        action={atualizarDepartamentos}
                        submitLabel="Salvar departamentos"
                      />

                      <PermissaoCheckboxesForm
                        id={perfil.id}
                        fieldName="modulos"
                        titulo="Módulos liberados (Futebol Profissional)"
                        opcoes={MODULOS.map((m) => ({ value: m.chave, label: m.label }))}
                        valoresIniciais={modulosPermitidos}
                        action={atualizarModulos}
                        submitLabel="Salvar módulos"
                        className="border-t border-neutral-100 pt-3"
                      />

                      {modulosPermitidos.includes("estoque") ? (
                        <PermissaoCheckboxesForm
                          id={perfil.id}
                          fieldName="estoqueCategorias"
                          titulo="Estoque: ramificações liberadas"
                          ajuda="Desmarque uma se essa pessoa não deve ver aquele estoque (ex.: só Médico)."
                          opcoes={ESTOQUE_CATEGORIAS}
                          valoresIniciais={estoqueCategoriasPermitidas}
                          action={atualizarEstoqueCategorias}
                          submitLabel="Salvar ramificações de estoque"
                          className="ml-4 border-l-2 border-neutral-100 pl-4"
                        />
                      ) : null}
                    </>
                  )}

                  <PermissaoCheckboxesForm
                    id={perfil.id}
                    fieldName="tarefasCategorias"
                    titulo="Categorias de Tarefas visíveis"
                    opcoes={TAREFA_CATEGORIAS}
                    valoresIniciais={categoriasTarefasVisiveis}
                    action={atualizarCategoriasTarefas}
                    submitLabel="Salvar categorias de tarefas"
                    className="border-t border-neutral-100 pt-3"
                  />
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
