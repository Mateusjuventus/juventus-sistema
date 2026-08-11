import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { TermoRetiradaItemRow, TermoRetiradaRow } from "@/lib/supabase/types";
import { atualizarTermo } from "../../actions";
import { TermoForm } from "../../termo-form";

export default async function EditarTermoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: termoData }, { data: itensData }] = await Promise.all([
    supabase.from("termos_retirada").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("termo_retirada_itens").select("*").eq("termo_id", params.id).order("ordem"),
  ]);
  if (!termoData) notFound();

  const termo = termoData as TermoRetiradaRow;
  const itens = (itensData ?? []) as TermoRetiradaItemRow[];
  const action = atualizarTermo.bind(null, termo.id);

  return (
    <AppShell>
      <Link href={`/termos/${termo.id}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para o termo
      </Link>
      <PageHeader title={`Editar Termo Nº ${String(termo.numero).padStart(4, "0")}`} />
      <TermoForm termo={termo} itensIniciais={itens} action={action} submitLabel="Salvar alterações" />
    </AppShell>
  );
}
