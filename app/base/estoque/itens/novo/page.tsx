import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createItemBase } from "../../actions";
import { ItemFormBase } from "../../item-form";

export default function NovoItemEstoqueBasePage() {
  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/estoque" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo item — Estoque</h1>
      <div className="mt-6">
        <ItemFormBase action={createItemBase} submitLabel="Cadastrar item" />
      </div>
    </AppShell>
  );
}
