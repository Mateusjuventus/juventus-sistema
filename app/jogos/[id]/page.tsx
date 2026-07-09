import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoRow } from "@/lib/supabase/types";
import { JogoForm } from "../jogo-form";
import { updateJogo } from "../actions";

export default async function EditarJogoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("jogos").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const jogo = data as JogoRow;
  const logoUrl = await getSignedPhotoUrl(supabase, jogo.adversario_logo_path);

  const defaultValues: Record<string, string> = {
    competicao: jogo.competicao,
    rodadaFase: jogo.rodada_fase ?? "",
    adversarioNome: jogo.adversario_nome,
    dataJogo: jogo.data_jogo,
    horario: jogo.horario ?? "",
    localEstadio: jogo.local_estadio ?? "",
    endereco: jogo.endereco ?? "",
    mandante: jogo.mandante ? "on" : "",
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Editar jogo</h1>
      <div className="mt-4">
        <JogoForm
          action={updateJogo}
          entityId={jogo.id}
          defaultValues={defaultValues}
          logoUrl={logoUrl}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
