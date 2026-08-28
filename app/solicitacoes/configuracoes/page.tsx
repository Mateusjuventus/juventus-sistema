import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { buscarPerfisParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoSolicitacoesRow } from "@/lib/supabase/types";
import { ConfiguracaoEncarregadoForm } from "./configuracao-encarregado-form";
import { updateConfiguracaoSolicitacoes } from "./actions";

/**
 * Quem assina digitalmente como "Encarregado do Departamento" nas Solicitações do Futebol
 * Profissional (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md,
 * Fase 2) — o Solicitante é sempre quem cria (auto-assina), esse é o segundo assinante fixo.
 */
export default async function ConfiguracoesSolicitacoesPage() {
  const supabase = createClient();
  const [{ data }, perfis] = await Promise.all([
    supabase.from("configuracoes_solicitacoes").select("*").limit(1).maybeSingle(),
    buscarPerfisParaSelecao(supabase),
  ]);
  const config = data as ConfiguracaoSolicitacoesRow | null;

  const defaultValues = {
    encarregadoNome: config?.encarregado_nome ?? "",
    encarregadoCargo: config?.encarregado_cargo ?? "",
    encarregadoUsuarioId: config?.encarregado_usuario_id ?? "",
  };

  return (
    <AppShell>
      <Link href="/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Solicitações
      </Link>
      <PageHeader title="Assinatura das Solicitações" />
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-500">
        Quem assina como Encarregado do Departamento em toda Solicitação do Futebol Profissional. O
        Solicitante é sempre quem cria a solicitação — não precisa configurar.
      </p>
      <div className="mx-auto mt-6 max-w-2xl">
        <ConfiguracaoEncarregadoForm
          action={updateConfiguracaoSolicitacoes}
          entityId={config?.id ?? ""}
          defaultValues={defaultValues}
          perfis={perfis}
        />
      </div>
    </AppShell>
  );
}
