import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { createClient } from "@/lib/supabase/server";
import { getDepartamentosPermitidos, getModulosPermitidos, getModulosBasePermitidos, getUserRole } from "@/lib/auth/role";
import { DEPARTAMENTOS } from "@/lib/auth/departamentos";
import { MODULOS } from "@/lib/auth/modulos";
import { MODULOS_BASE } from "@/lib/auth/modulos-base";
import { trocarMinhaSenha } from "./actions";

/**
 * Autoatendimento da própria conta — e-mail, papel e o que a pessoa tem liberado (só leitura), mais
 * o formulário de trocar a própria senha. Diferente de `/usuarios` (só master, edita OUTROS
 * usuários), esta tela é sobre a própria conta de quem está logado, disponível pra qualquer papel.
 */
export default async function MinhaContaPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    role,
    departamentosPermitidos,
    modulosPermitidos,
    modulosBasePermitidos,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
    getDepartamentosPermitidos(supabase),
    getModulosPermitidos(supabase),
    getModulosBasePermitidos(supabase),
  ]);

  const master = role === "master";

  return (
    <AppShell>
      <PageHeader title="Minha Conta" />

      <div className="mx-auto mt-6 max-w-2xl space-y-4">
        <div className="card space-y-4 p-5">
          <div>
            <p className="field-label">E-mail</p>
            <p className="text-sm text-neutral-800">{user?.email ?? "—"}</p>
          </div>

          <div>
            <p className="field-label">Papel</p>
            <p className="text-sm text-neutral-800">{master ? "Master" : "Regular"}</p>
          </div>

          <div>
            <p className="field-label">Departamentos liberados</p>
            {master ? (
              <p className="text-sm text-neutral-800">Todos</p>
            ) : (
              <p className="text-sm text-neutral-800">
                {departamentosPermitidos.length > 0
                  ? DEPARTAMENTOS.filter((d) => departamentosPermitidos.includes(d.chave))
                      .map((d) => d.label)
                      .join(", ")
                  : "Nenhum"}
              </p>
            )}
          </div>

          {departamentosPermitidos.includes("futebol_profissional") ? (
            <div>
              <p className="field-label">Módulos liberados (Futebol Profissional)</p>
              {master ? (
                <p className="text-sm text-neutral-800">Todos</p>
              ) : (
                <p className="text-sm text-neutral-800">
                  {modulosPermitidos.length > 0
                    ? MODULOS.filter((m) => modulosPermitidos.includes(m.chave))
                        .map((m) => m.label)
                        .join(", ")
                    : "Nenhum"}
                </p>
              )}
            </div>
          ) : null}

          {departamentosPermitidos.includes("futebol_base") ? (
            <div>
              <p className="field-label">Módulos liberados (Futebol de Base)</p>
              {master ? (
                <p className="text-sm text-neutral-800">Todos</p>
              ) : (
                <p className="text-sm text-neutral-800">
                  {modulosBasePermitidos.length > 0
                    ? MODULOS_BASE.filter((m) => modulosBasePermitidos.includes(m.chave))
                        .map((m) => m.label)
                        .join(", ")
                    : "Nenhum"}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <TrocarSenhaForm action={trocarMinhaSenha} />
      </div>
    </AppShell>
  );
}
