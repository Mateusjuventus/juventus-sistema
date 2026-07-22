import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { RoomingListBaseRow, RoomingListOcupanteBaseRow, RoomingListQuartoBaseRow } from "@/lib/supabase/types";
import { getJogoBaseEConvocados } from "../operacao-data";
import { RoomingListFormBase, type QuartoInicial } from "./rooming-list-form-base";
import { saveRoomingListBase } from "../operacao-actions";

/** Espelha `app/jogos/[id]/rooming-list/page.tsx` para o Futebol de Base. */
export default async function RoomingListBasePage({
  params,
}: {
  params: { id: string };
}) {
  const dados = await getJogoBaseEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, atletas, comissao, staff } = dados;

  if (!convocacao) {
    return (
      <AppShell departamento="futebol_base">
        <JogoTabsBase jogoId={jogo.id} active="rooming-list" />
        <AvisoSemConvocacao jogoId={jogo.id} convocacaoHref={`/base/jogos/${jogo.id}/convocacao`} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: roomingListData } = await supabase
    .from("rooming_list_base")
    .select("*")
    .eq("jogo_id", jogo.id)
    .maybeSingle();
  const roomingList = roomingListData as RoomingListBaseRow | null;

  let quartosIniciais: QuartoInicial[] = [];
  if (roomingList) {
    const { data: quartosData } = await supabase
      .from("rooming_list_quartos_base")
      .select("*")
      .eq("rooming_list_id", roomingList.id)
      .order("ordem", { ascending: true });
    const quartos = (quartosData ?? []) as RoomingListQuartoBaseRow[];
    const quartoIds = quartos.map((q) => q.id);
    let ocupantes: RoomingListOcupanteBaseRow[] = [];
    if (quartoIds.length > 0) {
      const { data: ocupantesData } = await supabase
        .from("rooming_list_ocupantes_base")
        .select("*")
        .in("quarto_id", quartoIds);
      ocupantes = (ocupantesData ?? []) as RoomingListOcupanteBaseRow[];
    }
    quartosIniciais = quartos.map((q) => ({
      tipo: q.tipo,
      ocupantes: ocupantes
        .filter((o) => o.quarto_id === q.id)
        .map((o) => ({ pessoaTipo: o.pessoa_tipo, pessoaId: o.pessoa_id })),
    }));
  }

  const temRoomingList = quartosIniciais.length > 0;

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="rooming-list" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Rooming List</h1>
        {temRoomingList ? (
          <a
            href={`/base/jogos/${jogo.id}/rooming-list/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Gerar PDF
          </a>
        ) : (
          <span className="text-xs text-neutral-400">Salve ao menos um quarto para liberar o PDF.</span>
        )}
      </div>

      <RoomingListFormBase
        action={saveRoomingListBase}
        jogoId={jogo.id}
        mandante={jogo.mandante}
        atletas={atletas}
        comissao={comissao}
        staff={staff}
        hotelNomeInicial={roomingList?.hotel_nome ?? ""}
        hotelEnderecoInicial={roomingList?.hotel_endereco ?? ""}
        checkinInicial={roomingList?.checkin ?? ""}
        checkoutInicial={roomingList?.checkout ?? ""}
        quartosIniciais={quartosIniciais}
      />
    </AppShell>
  );
}
