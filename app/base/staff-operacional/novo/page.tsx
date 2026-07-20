import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import { StaffBaseForm } from "../staff-base-form";
import { createStaffBase } from "../actions";

export default async function NovoStaffBasePage() {
  const supabase = createClient();
  const { data } = await supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true });
  const funcoes = (data ?? []) as StaffFuncaoCatalogoRow[];

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/staff-operacional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo staff operacional</h1>
      <div className="mt-4">
        <StaffBaseForm action={createStaffBase} submitLabel="Cadastrar" funcoes={funcoes} />
      </div>
    </AppShell>
  );
}
