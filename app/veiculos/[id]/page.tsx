import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { VeiculoRow } from "@/lib/supabase/types";
import { atualizarVeiculo } from "../actions";
import { carregarPessoasParaVeiculo } from "../pessoas-data";
import { VeiculoForm } from "../veiculo-form";

export default async function EditarVeiculoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, pessoas] = await Promise.all([
    supabase.from("veiculos").select("*").eq("id", params.id).maybeSingle(),
    carregarPessoasParaVeiculo(),
  ]);
  if (!data) notFound();
  const veiculo = data as VeiculoRow;

  const action = atualizarVeiculo.bind(null, veiculo.id);

  return (
    <AppShell>
      <Link href="/veiculos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Veículos / Placas
      </Link>
      <PageHeader title="Editar Veículo" />
      <VeiculoForm veiculo={veiculo} pessoas={pessoas} action={action} submitLabel="Salvar alterações" />
    </AppShell>
  );
}
