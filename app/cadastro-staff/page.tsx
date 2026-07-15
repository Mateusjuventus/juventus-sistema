import { JuventusCrest } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracaoCadastroStaffRow, StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import { StaffPublicoForm } from "./staff-publico-form";
import { cadastrarStaffPublico } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Link público de autocadastro do Staff Operacional — sem login (ver PUBLIC_PATHS em
 * lib/supabase/middleware.ts). Só permite CRIAR um cadastro; não existe edição nem visualização
 * pública dos dados depois de enviados. Roda com o cliente admin (service_role), já que quem abre
 * esta página não tem sessão autenticada.
 */
export default async function CadastroStaffPublicoPage() {
  const admin = createAdminClient();

  const [{ data: configData, error: configError }, { data: funcoesData, error: funcoesError }] =
    await Promise.all([
      admin.from("configuracoes_cadastro_staff").select("*").limit(1).maybeSingle(),
      admin.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
    ]);

  if (configError) console.error("[cadastro-staff] erro ao buscar configuracao:", configError);
  if (funcoesError) console.error("[cadastro-staff] erro ao buscar funcoes:", funcoesError);

  const config = configData as ConfiguracaoCadastroStaffRow | null;
  const ativo = config?.cadastro_publico_ativo ?? false;
  const funcoes = (funcoesData ?? []) as StaffFuncaoCatalogoRow[];

  return (
    <main className="min-h-screen bg-grena-escuro px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Cadastro de Staff Operacional</p>
        </div>

        <div className="card p-6 sm:p-8">
          {ativo ? (
            <StaffPublicoForm action={cadastrarStaffPublico} funcoes={funcoes} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-grena-escuro">Cadastro temporariamente fechado</p>
              <p className="mt-2 text-sm text-neutral-500">
                Fale com o responsável do Departamento de Futebol Profissional para saber como
                enviar seu cadastro.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
