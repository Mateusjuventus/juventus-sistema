import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { formatCPF } from "@/lib/validation/cpf";
import type { StaffOperacionalRow } from "@/lib/supabase/types";
import { StaffForm } from "../staff-form";
import { updateStaff } from "../actions";

export default async function EditarStaffPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("staff_operacional").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const s = data as StaffOperacionalRow;

  const defaultValues: Record<string, string> = {
    nomeCompleto: s.nome_completo,
    rg: s.rg,
    cpf: formatCPF(s.cpf),
    dataNascimento: s.data_nascimento,
    funcaoSetor: s.funcao_setor,
    telefone: s.telefone ?? "",
    chavePix: s.chave_pix ?? "",
    valorPadraoPagamento: s.valor_padrao_pagamento?.toString() ?? "",
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Editar staff operacional</h1>
      <div className="mt-4">
        <StaffForm
          action={updateStaff.bind(null, s.id)}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
