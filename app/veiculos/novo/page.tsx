import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { criarVeiculo } from "../actions";
import { carregarPessoasParaVeiculo } from "../pessoas-data";
import { VeiculoForm } from "../veiculo-form";

export default async function NovoVeiculoPage() {
  const pessoas = await carregarPessoasParaVeiculo();

  return (
    <AppShell breadcrumb="Novo Veículo">
      <Link href="/veiculos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Veículos / Placas
      </Link>
      <VeiculoForm action={criarVeiculo} pessoas={pessoas} submitLabel="Salvar veículo" />
    </AppShell>
  );
}
