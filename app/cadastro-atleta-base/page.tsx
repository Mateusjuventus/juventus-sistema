import { JuventusCrest } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracaoCadastroAtletaBaseRow } from "@/lib/supabase/types";
import { AtletaPublicoForm } from "./atleta-publico-form";
import { cadastrarAtletaPublicoBase } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Ficha de Cadastro pública de Atleta — espelha `app/cadastro-staff-base/page.tsx`, mas grava DIRETO
 * em `atletas_base` (sem relação nenhuma com a Captação, ver docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md). Controlado por
 * `configuracoes_cadastro_atleta_base`, sem login (ver PUBLIC_PATHS).
 */
export default async function CadastroAtletaBasePublicoPage() {
  const admin = createAdminClient();

  const { data: configData, error: configError } = await admin
    .from("configuracoes_cadastro_atleta_base")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (configError) console.error("[cadastro-atleta-base] erro ao buscar configuracao:", configError);

  const config = configData as ConfiguracaoCadastroAtletaBaseRow | null;
  const ativo = config?.cadastro_publico_ativo ?? false;

  return (
    <main className="min-h-screen bg-grena-escuro px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Ficha de Cadastro — Futebol de Base</p>
        </div>

        <div className="card p-6 sm:p-8">
          {ativo ? (
            <AtletaPublicoForm action={cadastrarAtletaPublicoBase} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-grena-escuro">Cadastro temporariamente fechado</p>
              <p className="mt-2 text-sm text-neutral-500">
                Fale com o responsável do Futebol de Base para saber como enviar a ficha.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
