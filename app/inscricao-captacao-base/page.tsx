import { JuventusCrest, JuventusCrestMark } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracaoInscricaoCaptacaoBaseRow } from "@/lib/supabase/types";
import { InscricaoCaptacaoForm } from "./inscricao-form";
import { inscreverCaptacao, verificarCandidatoExistente } from "./actions";

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
    <main className="min-h-screen bg-pagina">
      {/* Faixa de cabeçalho em `grena` (cor de área grande, ver lib/theme.ts) com uma linha de
          acento em `dourado` — separa claramente "identidade do clube" de "conteúdo do
          formulário", em vez da tela inteira numa cor só. Mesmo brasão/paleta do resto do sistema,
          só a composição muda. */}
      <div className="bg-grena">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-10 text-center sm:py-12">
          <JuventusCrest className="h-20 w-auto drop-shadow-lg sm:h-24" />
          <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Clube Atlético Juventus SAF</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-dourado sm:text-sm">
            Departamento de Futebol de Base
          </p>
          <p className="mt-1 text-sm text-white/70">Inscrição para avaliação de atletas</p>
        </div>
        <div className="h-1 bg-dourado" />
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        <div className="card p-6 shadow-md sm:p-8">
          {ativo ? (
            <InscricaoCaptacaoForm action={inscreverCaptacao} verificarAction={verificarCandidatoExistente} />
          ) : (
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-10 w-10 text-neutral-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <p className="mt-3 text-lg font-semibold text-grena-escuro">Inscrições temporariamente fechadas</p>
              <p className="mt-2 text-sm text-neutral-500">
                Fale com o responsável do Futebol de Base para saber como se inscrever.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <JuventusCrestMark className="h-8 w-auto opacity-50" />
          <p className="text-xs text-neutral-400">Clube Atlético Juventus SAF — Futebol de Base</p>
        </div>
      </div>
    </main>
  );
}
