import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { criarVeiculo } from "../actions";
import { carregarPessoasParaVeiculo } from "../pessoas-data";
import { VeiculoForm } from "../veiculo-form";

export default async function NovoVeiculoPage() {
  const pessoas = await carregarPessoasParaVeiculo();

  return (
    <AppShell>
      <Link href="/veiculos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Veículos / Placas
      </Link>
      <PageHeader title="Novo Veículo" />
      <VeiculoForm action={criarVeiculo} pessoas={pessoas} submitLabel="Salvar veículo" />
    </AppShell>
  );
}
