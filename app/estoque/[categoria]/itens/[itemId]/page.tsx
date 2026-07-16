import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueItemRow } from "@/lib/supabase/types";
import { updateItem } from "../../actions";
import { ItemForm } from "../item-form";

export default async function EditarItemEstoquePage({
  params,
}: {
  params: { categoria: string; itemId: string };
}) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) notFound();
  const label = ESTOQUE_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;

  const supabase = createClient();
  const { data } = await supabase.from("estoque_itens").select("*").eq("id", params.itemId).single();
  if (!data) notFound();
  const item = data as EstoqueItemRow;

  const tamanhosIniciais = Object.entries(item.tamanhos ?? {}).map(([tamanho, quantidade]) => ({
    rowId: `${item.id}-${tamanho}`,
    tamanho,
    quantidade: String(quantidade),
  }));

  return (
    <AppShell>
      <Link href={`/estoque/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque {label}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar item — {item.nome}</h1>
      <p className="text-sm text-neutral-500">
        As quantidades aqui corrigem o cadastro diretamente. Pra registrar material chegando ou
        saindo normalmente, use Nova Entrada / Nova Saída — assim fica um histórico do que
        aconteceu.
      </p>
      <div className="mt-6">
        <ItemForm
          action={updateItem}
          categoria={categoria}
          itemId={item.id}
          defaultValues={{ nome: item.nome, codigo: item.codigo ?? "", mg: item.mg ?? "" }}
          tamanhosIniciais={tamanhosIniciais}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
