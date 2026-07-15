import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { formatCPF } from "@/lib/validation/cpf";
import type { StaffFuncaoCatalogoRow, StaffOperacionalRow } from "@/lib/supabase/types";
import { StaffForm } from "../staff-form";
import { updateStaff } from "../actions";

export default async function EditarStaffPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, { data: funcoesData }] = await Promise.all([
    supabase.from("staff_operacional").select("*").eq("id", params.id).single(),
    supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
  ]);

  if (!data) notFound();

  const s = data as StaffOperacionalRow;
  const funcoes = (funcoesData ?? []) as StaffFuncaoCatalogoRow[];

  const defaultValues: Record<string, string> = {
    nomeCompleto: s.nome_completo,
    rg: s.rg,
    cpf: formatCPF(s.cpf),
    dataNascimento: s.data_nascimento,
    funcaoId: s.funcao_id,
    telefone: s.telefone ?? "",
    email: s.email ?? "",
    cep: s.cep ?? "",
    logradouro: s.logradouro ?? "",
    numero: s.numero ?? "",
    complemento: s.complemento ?? "",
    bairro: s.bairro ?? "",
    cidade: s.cidade ?? "",
    uf: s.uf ?? "",
    chavePix: s.chave_pix ?? "",
    chavePixTipo: s.chave_pix_tipo ?? "",
    valorPadraoPagamento: s.valor_padrao_pagamento?.toString() ?? "",
  };

  return (
    <AppShell>
      <Link href="/staff-operacional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar staff operacional</h1>
      <div className="mt-4">
        <StaffForm
          action={updateStaff}
          entityId={s.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
          funcoes={funcoes}
        />
      </div>
    </AppShell>
  );
}
