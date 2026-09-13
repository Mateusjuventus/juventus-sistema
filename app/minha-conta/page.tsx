import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { NomeCargoForm } from "@/components/nome-cargo-form";
import { MinhaAssinaturaForm } from "@/components/minha-assinatura-form";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssinaturaUrl } from "@/lib/supabase/storage";
import { getDepartamentosPermitidos, getModulosPermitidos, getModulosBasePermitidos, getUserRole } from "@/lib/auth/role";
import { resolverNomeCargoParaAssinatura } from "@/lib/assinaturas/nome-cargo";
import { DEPARTAMENTOS } from "@/lib/auth/departamentos";
import { MODULOS } from "@/lib/auth/modulos";
import { MODULOS_BASE } from "@/lib/auth/modulos-base";
import { trocarMinhaSenha, salvarMeuNomeCargo, salvarMinhaAssinatura } from "./actions";

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

  const { data: perfil } = user
    ? await supabase
        .from("perfis")
        .select("nome, cargo, assinatura_path, comissao_tecnica_id, comissao_tecnica_base_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const assinaturaUrl = await getSignedAssinaturaUrl(supabase, perfil?.assinatura_path ?? null);

  const vinculado = Boolean(perfil?.comissao_tecnica_id || perfil?.comissao_tecnica_base_id);
  const { nome: nomeExibido, cargo: cargoExibido } = perfil
    ? await resolverNomeCargoParaAssinatura(supabase, perfil)
    : { nome: null, cargo: null };

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

        <div className="card p-5">
          {vinculado ? (
            <div>
              <p className="field-label">Nome</p>
              <p className="text-sm text-neutral-800">{nomeExibido ?? "—"}</p>
              <p className="field-label mt-3">Cargo</p>
              <p className="text-sm text-neutral-800">{cargoExibido ?? "—"}</p>
              <p className="mt-2 text-xs text-neutral-400">
                Vinculado ao cadastro da Comissão Técnica — pra alterar, atualize o cadastro lá.
              </p>
            </div>
          ) : (
            <NomeCargoForm action={salvarMeuNomeCargo} nome={perfil?.nome ?? null} cargo={perfil?.cargo ?? null} />
          )}
        </div>

        <div className="card p-5">
          <MinhaAssinaturaForm action={salvarMinhaAssinatura} assinaturaUrl={assinaturaUrl} />
        </div>

        <TrocarSenhaForm action={trocarMinhaSenha} />
      </div>
    </AppShell>
  );
}
