import { JuventusCrest } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracaoCadastroStaffBaseRow, StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import { StaffPublicoBaseForm } from "./staff-publico-base-form";
import { cadastrarStaffPublicoBase } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Link público de autocadastro do Staff Operacional do Futebol de Base — espelha
 * `app/cadastro-staff/page.tsx`, mas controlado por `configuracoes_cadastro_staff_base`
 * (totalmente independente do toggle do Profissional) e gravando em `staff_operacional_base`. Sem
 * login (ver PUBLIC_PATHS em lib/supabase/middleware.ts); só permite CRIAR um cadastro. O catálogo
 * de funções (`staff_funcoes_catalogo`) é o mesmo do Profissional — compartilhado, não duplicado.
 */
export default async function CadastroStaffBasePublicoPage() {
  const admin = createAdminClient();

  const [{ data: configData, error: configError }, { data: funcoesData, error: funcoesError }] =
    await Promise.all([
      admin.from("configuracoes_cadastro_staff_base").select("*").limit(1).maybeSingle(),
      admin.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
    ]);

  if (configError) console.error("[cadastro-staff-base] erro ao buscar configuracao:", configError);
  if (funcoesError) console.error("[cadastro-staff-base] erro ao buscar funcoes:", funcoesError);

  const config = configData as ConfiguracaoCadastroStaffBaseRow | null;
  const ativo = config?.cadastro_publico_ativo ?? false;
  const funcoes = (funcoesData ?? []) as StaffFuncaoCatalogoRow[];

  return (
    <main className="min-h-screen bg-emerald-900 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Cadastro de Staff Operacional — Futebol de Base</p>
        </div>

        <div className="card p-6 sm:p-8">
          {ativo ? (
            <StaffPublicoBaseForm action={cadastrarStaffPublicoBase} funcoes={funcoes} />
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
