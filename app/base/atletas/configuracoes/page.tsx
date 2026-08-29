import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { buscarPerfisParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoDispensaBaseRow } from "@/lib/supabase/types";
import { ConfiguracaoDepartamentoForm } from "./configuracao-departamento-form";
import { updateConfiguracaoDispensaBase } from "./actions";

/** Fase 3 (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md) — quem
 * assina como "Departamento" em todo Relatório de Dispensa. */
export default async function ConfiguracoesAtletasBasePage() {
  const supabase = createClient();
  const [{ data }, perfis] = await Promise.all([
    supabase.from("configuracoes_dispensa_base").select("*").limit(1).maybeSingle(),
    buscarPerfisParaSelecao(supabase),
  ]);
  const config = data as ConfiguracaoDispensaBaseRow | null;

  const defaultValues = {
    departamentoUsuarioId: config?.departamento_usuario_id ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/atletas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Atletas
      </Link>
      <PageHeader title="Assinatura do Relatório de Dispensa" />
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-500">
        Quem assina como Departamento de Futebol de Base em todo Relatório de Dispensa. O Treinador
        é sempre quem preenche a avaliação — não precisa configurar.
      </p>
      <div className="mx-auto mt-6 max-w-2xl">
        <ConfiguracaoDepartamentoForm
          action={updateConfiguracaoDispensaBase}
          entityId={config?.id ?? ""}
          defaultValues={defaultValues}
          perfis={perfis}
        />
      </div>
    </AppShell>
  );
}
