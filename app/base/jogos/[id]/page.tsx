import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { verificarAcessoJogoBase } from "@/lib/auth/jogos-base-guard";
import { JogoBaseForm } from "../jogo-form-base";
import { updateJogoBase, deleteJogoBase } from "../actions";

export default async function EditarJogoBasePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const jogo = await verificarAcessoJogoBase(supabase, params.id);
  if (!jogo) notFound();

  const [logoUrl, categoriasPermitidas] = await Promise.all([
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
    getCategoriasBasePermitidas(supabase),
  ]);

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
        <JogoTabsBase jogoId={jogo.id} active="dados" />
        <JogoBaseForm
          action={updateJogoBase}
          entityId={jogo.id}
          defaultValues={defaultValues}
          logoUrl={logoUrl}
          submitLabel="Salvar alterações"
          categoriasPermitidas={categoriasPermitidas}
        />

        <div className="mt-8 flex justify-end border-t border-linha pt-4">
          <DeleteButton action={deleteJogoBase} id={jogo.id} entityLabel="jogo (com toda a convocação, súmula e logística dele)" />
        </div>
      </div>
    </AppShell>
  );
}
