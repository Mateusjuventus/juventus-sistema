import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { buscarPerfisParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoSolicitacoesBaseRow } from "@/lib/supabase/types";
import { ConfiguracaoEncarregadoFormBase } from "./configuracao-encarregado-form";
import { updateConfiguracaoSolicitacoesBase } from "./actions";

/** Espelha `app/solicitacoes/configuracoes/page.tsx` para o Futebol de Base — restrita a Master. */
export default async function ConfiguracoesSolicitacoesBasePage() {
  const supabase = createClient();
  if (!(await isMaster(supabase))) redirect("/base/solicitacoes");

  const [{ data }, perfis] = await Promise.all([
    supabase.from("configuracoes_solicitacoes_base").select("*").limit(1).maybeSingle(),
    buscarPerfisParaSelecao(supabase),
  ]);
  const config = data as ConfiguracaoSolicitacoesBaseRow | null;

  const defaultValues = {
    encarregadoNome: config?.encarregado_nome ?? "",
    encarregadoCargo: config?.encarregado_cargo ?? "",
    encarregadoUsuarioId: config?.encarregado_usuario_id ?? "",
    comprasCargo: config?.compras_cargo ?? "",
    comprasUsuarioId: config?.compras_usuario_id ?? "",
    financeiroCargo: config?.financeiro_cargo ?? "",
    financeiroUsuarioId: config?.financeiro_usuario_id ?? "",
    aprovadorCargo: config?.aprovador_cargo ?? "",
    aprovadorUsuarioId: config?.aprovador_usuario_id ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Solicitações
      </Link>
      <PageHeader title="Assinatura das Solicitações" />
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-500">
        Quem assina cada Solicitação do Futebol de Base, além do Solicitante (sempre quem cria — não
        precisa configurar): Encarregado do Departamento, Departamento de Compras ou Financeiro
        (conforme o tipo) e Aprovador.
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
