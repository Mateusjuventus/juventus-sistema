import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { MODULOS } from "@/lib/auth/modulos";
import type { PerfilRow } from "@/lib/supabase/types";
import { atualizarModulos, atualizarPapel } from "./actions";
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

              {perfil.role === "master" ? (
                <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                  Acesso completo a todos os módulos (papel Master).
                </p>
              ) : (
                <form action={atualizarModulos} className="space-y-2 border-t border-neutral-100 pt-3">
                  <input type="hidden" name="id" value={perfil.id} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Módulos liberados
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {MODULOS.map((modulo) => (
                      <label
                        key={modulo.chave}
                        className="flex items-center gap-2 text-sm text-neutral-700"
                      >
                        <input
                          type="checkbox"
                          name="modulos"
                          value={modulo.chave}
                          defaultChecked={modulosPermitidos.includes(modulo.chave)}
                          className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                        />
                        {modulo.label}
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="btn-secondary btn-sm">
                    Salvar módulos
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
