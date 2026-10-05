import { AppShell } from "@/components/app-shell";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { NomeCargoForm } from "@/components/nome-cargo-form";
import { MinhaAssinaturaForm } from "@/components/minha-assinatura-form";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssinaturaUrl } from "@/lib/supabase/storage";
import { getUserRole } from "@/lib/auth/role";
import { resolverNomeCargoParaAssinatura, treinadorPossuiVinculoObrigatorio } from "@/lib/assinaturas/nome-cargo";
import { trocarMinhaSenha, salvarMeuNomeCargo, salvarMinhaAssinatura } from "./actions";

/**
 * Autoatendimento da própria conta — e-mail, papel, nome/função (vinculado à Comissão Técnica ou
 * preenchido na mão), assinatura e o formulário de trocar a própria senha. Diferente de `/usuarios`
 * (só master, edita OUTROS usuários), esta tela é sobre a própria conta de quem está logado,
 * disponível pra qualquer papel — inclusive Treinador, que só chega até aqui por uma exceção no
 * middleware (ver docs/superpowers/specs/2026-10-02-assinatura-treinador-design.md).
 *
 * Não mostra mais Departamentos/Módulos liberados (tirados daqui a pedido do Mateus — informação
 * que já aparece em `/usuarios`, pra quem administra; aqui não precisa) — ver a mesma spec.
 */
export default async function MinhaContaPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    role,
  ] = await Promise.all([supabase.auth.getUser(), getUserRole(supabase)]);

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

  const roleLabel = role === "master" ? "Master" : role === "treinador" ? "Treinador" : "Regular";
  // Pro Treinador o vínculo é obrigatório (ver a spec) — um login criado antes dessa mudança pode
  // ainda estar sem vínculo; nesse caso não mostra o formulário manual de nome/cargo (nunca se
  // aplica a esse papel), avisa que falta alguém vincular.
  const treinadorSemVinculo = role === "treinador" && perfil && !treinadorPossuiVinculoObrigatorio(perfil);

  return (
    <AppShell breadcrumb="Minha Conta">
      <div className="mx-auto mt-6 max-w-2xl space-y-4">
        <div className="card space-y-4 p-5">
          <div>
            <p className="field-label">E-mail</p>
            <p className="text-sm text-neutral-800">{user?.email ?? "—"}</p>
          </div>

          <div>
            <p className="field-label">Papel</p>
            <p className="text-sm text-neutral-800">{roleLabel}</p>
          </div>
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
          ) : treinadorSemVinculo ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Seu cadastro ainda não foi vinculado a ninguém da Comissão Técnica — fale com o
              responsável antes de cadastrar a assinatura.
            </p>
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
