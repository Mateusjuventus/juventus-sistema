import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { buscarPerfisParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoSolicitacoesBaseRow } from "@/lib/supabase/types";
import { ConfiguracaoEncarregadoFormBase } from "./configuracao-encarregado-form";
import { updateConfiguracaoSolicitacoesBase } from "./actions";

/** Espelha `app/solicitacoes/configuracoes/page.tsx` para o Futebol de Base. */
export default async function ConfiguracoesSolicitacoesBasePage() {
  const supabase = createClient();
  const [{ data }, perfis] = await Promise.all([
    supabase.from("configuracoes_solicitacoes_base").select("*").limit(1).maybeSingle(),
    buscarPerfisParaSelecao(supabase),
  ]);
  const config = data as ConfiguracaoSolicitacoesBaseRow | null;

  const defaultValues = {
    encarregadoNome: config?.encarregado_nome ?? "",
    encarregadoCargo: config?.encarregado_cargo ?? "",
    encarregadoUsuarioId: config?.encarregado_usuario_id ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Solicitações
      </Link>
      <PageHeader title="Assinatura das Solicitações" />
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-500">
        Quem assina como Encarregado do Departamento em toda Solicitação do Futebol de Base. O
        Solicitante é sempre quem cria a solicitação — não precisa configurar.
      </p>
      <div className="mx-auto mt-6 max-w-2xl">
        <ConfiguracaoEncarregadoFormBase
          action={updateConfiguracaoSolicitacoesBase}
          entityId={config?.id ?? ""}
          defaultValues={defaultValues}
          perfis={perfis}
        />
      </div>
    </AppShell>
  );
}
