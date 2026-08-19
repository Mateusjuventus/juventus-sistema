import { JuventusCrest } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracaoInscricaoCaptacaoBaseRow } from "@/lib/supabase/types";
import { InscricaoCaptacaoForm } from "./inscricao-form";
import { inscreverCaptacao } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Link público de inscrição pro teste/avaliação do Futebol de Base — grava em `captacao_base` com
 * `status: "inscricao"` (fica na fila de Aprovações, ver docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md). Totalmente separado da Ficha de Cadastro de
 * Atletas (`/cadastro-atleta-base`). Controlado por `configuracoes_inscricao_captacao_base`, sem
 * login (ver PUBLIC_PATHS).
 */
export default async function InscricaoCaptacaoBasePage() {
  const admin = createAdminClient();

  const { data: configData, error: configError } = await admin
    .from("configuracoes_inscricao_captacao_base")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (configError) console.error("[inscricao-captacao-base] erro ao buscar configuracao:", configError);

  const config = configData as ConfiguracaoInscricaoCaptacaoBaseRow | null;
  const ativo = config?.cadastro_publico_ativo ?? false;

  return (
    <main className="min-h-screen bg-grena-escuro px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Inscrição para avaliação — Futebol de Base</p>
        </div>

        <div className="card p-6 sm:p-8">
          {ativo ? (
            <InscricaoCaptacaoForm action={inscreverCaptacao} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-grena-escuro">Inscrições temporariamente fechadas</p>
              <p className="mt-2 text-sm text-neutral-500">
                Fale com o responsável do Futebol de Base para saber como se inscrever.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
