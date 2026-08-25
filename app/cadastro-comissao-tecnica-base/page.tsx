import { JuventusCrest } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracaoCadastroComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import { ComissaoPublicoBaseForm } from "./comissao-publico-base-form";
import { cadastrarComissaoTecnicaBasePublico } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Link público de autocadastro da Comissão Técnica/Diretoria — Futebol de Base — espelha
 * `app/cadastro-comissao-tecnica/page.tsx` (Profissional), mas controlado por
 * `configuracoes_cadastro_comissao_tecnica_base` e gravando em `comissao_tecnica_base`. Sem login
 * (ver PUBLIC_PATHS em lib/supabase/middleware.ts); só permite CRIAR um cadastro, e TODOS os
 * campos são obrigatórios (ver docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md).
 */
export default async function CadastroComissaoTecnicaBasePublicoPage() {
  const admin = createAdminClient();

  const { data: configData, error: configError } = await admin
    .from("configuracoes_cadastro_comissao_tecnica_base")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (configError) console.error("[cadastro-comissao-tecnica-base] erro ao buscar configuracao:", configError);

  const config = configData as ConfiguracaoCadastroComissaoTecnicaBaseRow | null;
  const ativo = config?.cadastro_publico_ativo ?? false;

  return (
    <main className="min-h-screen bg-grena-escuro px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Cadastro de Comissão Técnica/Diretoria — Futebol de Base</p>
        </div>

        <div className="card p-6 sm:p-8">
          {ativo ? (
            <ComissaoPublicoBaseForm action={cadastrarComissaoTecnicaBasePublico} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-grena-escuro">Cadastro temporariamente fechado</p>
              <p className="mt-2 text-sm text-neutral-500">
                Fale com o responsável do Futebol de Base para saber como enviar seu cadastro.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
