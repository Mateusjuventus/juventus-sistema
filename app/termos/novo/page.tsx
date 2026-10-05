import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { criarTermo } from "../actions";
import { TermoForm } from "../termo-form";

export default function NovoTermoPage() {
  return (
    <AppShell breadcrumb="Novo Termo de Retirada">
      <Link href="/termos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Termos de Retirada
      </Link>
      <p className="mt-1 text-center text-sm text-neutral-500">
        Para material do catálogo do Estoque, use Estoque → Saída. Aqui os itens são digitados livremente.
      </p>
      <TermoForm action={criarTermo} submitLabel="Salvar termo" />
    </AppShell>
  );
}
