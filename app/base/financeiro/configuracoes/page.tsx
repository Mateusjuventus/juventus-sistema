import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { ConfiguracaoFinanceiroBaseRow } from "@/lib/supabase/types";
import { ConfiguracaoFormBase } from "./configuracao-form-base";
import { updateConfiguracaoFinanceiroBase } from "./actions";

const PADRAO = {
  assinatura1_nome: "Mateus dos Santos",
  assinatura1_cargo: "Supervisor de Futebol",
  assinatura2_nome: "Pedro Machado",
  assinatura2_cargo: "Gerente de Futebol",
};

/** Espelha `app/financeiro/configuracoes/page.tsx` para o Futebol de Base. */
export default async function ConfiguracoesFinanceiroBasePage() {
  const supabase = createClient();
  const { data } = await supabase.from("configuracoes_financeiro_base").select("*").limit(1).maybeSingle();
  const config = data as ConfiguracaoFinanceiroBaseRow | null;

  const defaultValues = {
    assinatura1Nome: config?.assinatura1_nome ?? PADRAO.assinatura1_nome,
    assinatura1Cargo: config?.assinatura1_cargo ?? PADRAO.assinatura1_cargo,
    assinatura2Nome: config?.assinatura2_nome ?? PADRAO.assinatura2_nome,
    assinatura2Cargo: config?.assinatura2_cargo ?? PADRAO.assinatura2_cargo,
  };

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/financeiro" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Prestação de Contas
      </Link>
      <PageHeader title="Assinaturas dos Relatórios" />
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-500">
        Esses dois nomes e cargos aparecem no PDF do orçamento previsto e no relatório geral da
        Prestação de Contas do Futebol de Base. Altere aqui sempre que precisar trocar quem assina.
      </p>
      <div className="mx-auto mt-6 max-w-2xl">
        <ConfiguracaoFormBase
          action={updateConfiguracaoFinanceiroBase}
          entityId={config?.id ?? ""}
          defaultValues={defaultValues}
        />
      </div>
    </AppShell>
  );
}
