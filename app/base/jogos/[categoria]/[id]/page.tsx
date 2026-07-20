import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { JogoBaseRow } from "@/lib/supabase/types";
import { JogoBaseForm } from "../../jogo-form-base";
import { updateJogoBase } from "../../actions";

export default async function EditarJogoBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();
  const { data } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const jogo = data as JogoBaseRow;
  const logoUrl = await getSignedPhotoUrl(supabase, jogo.adversario_logo_path);

  const defaultValues: Record<string, string> = {
    categoria: jogo.categoria,
    competicao: jogo.competicao,
    rodadaFase: jogo.rodada_fase ?? "",
    adversarioNome: jogo.adversario_nome,
    dataJogo: jogo.data_jogo,
    horario: jogo.horario ?? "",
    localEstadio: jogo.local_estadio ?? "",
    endereco: jogo.endereco ?? "",
    mandante: jogo.mandante ? "on" : "",
    golsPro: jogo.gols_pro?.toString() ?? "",
    golsContra: jogo.gols_contra?.toString() ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <h1 className="text-2xl font-bold text-grena-escuro">Editar jogo</h1>
      <div className="mt-4">
        <JogoTabsBase jogoId={jogo.id} categoria={jogo.categoria} active="dados" />
        <JogoBaseForm
          action={updateJogoBase}
          entityId={jogo.id}
          defaultValues={defaultValues}
          logoUrl={logoUrl}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
