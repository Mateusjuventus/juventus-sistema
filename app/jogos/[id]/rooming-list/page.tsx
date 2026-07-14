import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { RoomingListOcupanteRow, RoomingListQuartoRow, RoomingListRow } from "@/lib/supabase/types";
import { getJogoEConvocados } from "../operacao-data";
import { RoomingListForm, type QuartoInicial } from "./rooming-list-form";
import { saveRoomingList } from "../operacao-actions";

export default async function RoomingListPage({ params }: { params: { id: string } }) {
  const dados = await getJogoEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, atletas, comissao, staff } = dados;

  if (!convocacao) {
    return (
      <AppShell>
        <JogoTabs jogoId={jogo.id} active="rooming-list" />
        <AvisoSemConvocacao jogoId={jogo.id} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: roomingListData } = await supabase
    .from("rooming_list")
    .select("*")
    .eq("jogo_id", jogo.id)
    .maybeSingle();
  const roomingList = roomingListData as RoomingListRow | null;

  let quartosIniciais: QuartoInicial[] = [];
  if (roomingList) {
    const { data: quartosData } = await supabase
      .from("rooming_list_quartos")
      .select("*")
      .eq("rooming_list_id", roomingList.id)
      .order("ordem", { ascending: true });
    const quartos = (quartosData ?? []) as RoomingListQuartoRow[];
    const quartoIds = quartos.map((q) => q.id);
    let ocupantes: RoomingListOcupanteRow[] = [];
    if (quartoIds.length > 0) {
      const { data: ocupantesData } = await supabase
        .from("rooming_list_ocupantes")
        .select("*")
        .in("quarto_id", quartoIds);
      ocupantes = (ocupantesData ?? []) as RoomingListOcupanteRow[];
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
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="rooming-list" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Rooming List</h1>
        {temRoomingList ? (
          <a
            href={`/jogos/${jogo.id}/rooming-list/pdf`}
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

      <RoomingListForm
        action={saveRoomingList}
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
