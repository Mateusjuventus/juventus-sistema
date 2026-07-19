import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type { IngressoCargaRow, JogoRow } from "@/lib/supabase/types";
import { CargaForm } from "../../carga-form";
import { updateCarga } from "../../actions";

export default async function EditarCargaPage({
  params,
}: {
  params: { id: string; cargaId: string };
}) {
  const supabase = createClient();
  const [{ data: jogoData }, { data: cargaData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase.from("ingressos_cargas").select("*").eq("id", params.cargaId).single(),
  ]);

  if (!jogoData || !cargaData) notFound();

  const jogo = jogoData as JogoRow;
  const carga = cargaData as IngressoCargaRow;

  const defaultValues: Record<string, string> = {
    quantidade: carga.quantidade.toString(),
    data: carga.data,
    observacoes: carga.observacoes ?? "",
  };

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="ingressos" />
      <Link
        href={`/jogos/${jogo.id}/ingressos`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Carga de Ingressos
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar carga</h1>
      <div className="mt-4">
        <CargaForm
          action={updateCarga}
          jogoId={jogo.id}
          cargaId={carga.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
