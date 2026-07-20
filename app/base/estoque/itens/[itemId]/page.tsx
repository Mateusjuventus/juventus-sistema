import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";
import { updateItemBase } from "../../actions";
import { ItemFormBase } from "../../item-form";

export default async function EditarItemEstoqueBasePage({ params }: { params: { itemId: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("estoque_itens_base").select("*").eq("id", params.itemId).single();
  if (!data) notFound();
  const item = data as EstoqueItemBaseRow;

  const tamanhosIniciais = Object.entries(item.tamanhos ?? {}).map(([tamanho, quantidade]) => ({
    rowId: `${item.id}-${tamanho}`,
    tamanho,
    quantidade: String(quantidade),
  }));

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/estoque" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar item — {item.nome}</h1>
      <p className="text-sm text-neutral-500">
        As quantidades aqui corrigem o cadastro diretamente. Pra registrar material chegando ou
        saindo normalmente, use Nova Entrada / Nova Saída — assim fica um histórico do que
        aconteceu.
      </p>
      <div className="mt-6">
        <ItemFormBase
          action={updateItemBase}
          itemId={item.id}
          defaultValues={{ nome: item.nome, codigo: item.codigo ?? "" }}
          tamanhosIniciais={tamanhosIniciais}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
