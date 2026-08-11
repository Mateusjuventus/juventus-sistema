import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { criarTermo } from "../actions";
import { TermoForm } from "../termo-form";

export default function NovoTermoPage() {
  return (
    <AppShell>
      <Link href="/termos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Termos de Retirada
      </Link>
      <PageHeader title="Novo Termo de Retirada" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Para material do catálogo do Estoque, use Estoque → Saída. Aqui os itens são digitados livremente.
      </p>
      <TermoForm action={criarTermo} submitLabel="Salvar termo" />
    </AppShell>
  );
}
