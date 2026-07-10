import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import { StaffForm } from "../staff-form";
import { createStaff } from "../actions";

export default async function NovoStaffPage() {
  const supabase = createClient();
  const { data } = await supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true });
  const funcoes = (data ?? []) as StaffFuncaoCatalogoRow[];

  return (
    <AppShell>
      <Link href="/staff-operacional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo staff operacional</h1>
      <div className="mt-4">
        <StaffForm action={createStaff} submitLabel="Cadastrar" funcoes={funcoes} />
      </div>
    </AppShell>
  );
}
