import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { parseCategoria } from "@/lib/estoque/categoria";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import { createItem } from "../../actions";
import { ItemForm } from "../item-form";

export default function NovoItemEstoquePage({ params }: { params: { categoria: string } }) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) notFound();
  const label = ESTOQUE_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;

  return (
    <AppShell>
      <Link href={`/estoque/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque {label}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo item — Estoque {label}</h1>
      <div className="mt-6">
        <ItemForm action={createItem} categoria={categoria} submitLabel="Cadastrar item" />
      </div>
    </AppShell>
  );
}
