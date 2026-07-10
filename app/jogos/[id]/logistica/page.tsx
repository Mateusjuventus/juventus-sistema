import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  ConvocacaoAtletaRow,
  ConvocacaoComissaoRow,
  ConvocacaoRow,
  ConvocacaoStaffRow,
  CredenciamentoCatalogoRow,
  CredenciamentoJogoRow,
  JogoRow,
  OnibusListaRow,
  OnibusPassageiroRow,
  RoomingListOcupanteRow,
  RoomingListQuartoRow,
  RoomingListRow,
  StaffOperacionalComFuncaoRow,
} from "@/lib/supabase/types";
import { RoomingListForm, type QuartoInicial } from "./rooming-list-form";
import { OnibusForm, type OnibusInicial } from "./onibus-form";
import { CredenciamentoForm, type CredenciamentoAtual } from "./credenciamento-form";
import { saveRoomingList, saveOnibus, saveCredenciamento } from "./actions";

export default async function LogisticaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: convocacaoData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase.from("convocacoes").select("*").eq("jogo_id", params.id).maybeSingle(),
  ]);

  if (!jogoData) notFound();
  const jogo = jogoData as JogoRow;
  const convocacao = convocacaoData as ConvocacaoRow | null;

  if (!convocacao) {
    return (
      <AppShell>
        <JogoTabs jogoId={jogo.id} active="logistica" />
        <div className="card mt-4 p-8 text-center">
          <p className="text-neutral-600">
            Monte a convocação deste jogo primeiro — a logística (rooming list, ônibus e
            credenciamento) é organizada a partir de quem foi convocado.
          </p>
          <Link href={`/jogos/${jogo.id}/convocacao`} className="btn-primary mt-4 inline-flex">
            Ir para a Convocação
          </Link>
        </div>
      </AppShell>
    );
  }

  const [
    { data: caData },
    { data: ccData },
    { data: csData },
    { data: roomingListData },
    { data: onibusData },
    { data: catalogoData },
    { data: credenciamentoData },
  ] = await Promise.all([
    supabase.from("convocacao_atletas").select("*").eq("convocacao_id", convocacao.id),
    supabase.from("convocacao_comissao").select("*, pessoa:comissao_tecnica(*)").eq("convocacao_id", convocacao.id),
    supabase
      .from("convocacao_staff")
      .select("*, pessoa:staff_operacional(*, funcao:staff_funcoes_catalogo(nome))")
      .eq("convocacao_id", convocacao.id),
    supabase.from("rooming_list").select("*").eq("jogo_id", jogo.id).maybeSingle(),
    supabase.from("onibus_lista").select("*").eq("jogo_id", jogo.id).order("onibus_numero", { ascending: true }),
    supabase.from("credenciamento_catalogo").select("*").order("zona", { ascending: true }),
    supabase.from("credenciamento_jogo").select("*").eq("jogo_id", jogo.id),
  ]);

  const convocacaoAtletaIds = ((caData ?? []) as ConvocacaoAtletaRow[]).map((c) => c.atleta_id);
  const comissaoConvocada = ((ccData ?? []) as (ConvocacaoComissaoRow & { pessoa: ComissaoTecnicaRow | null })[])
    .map((c) => c.pessoa)
    .filter((p): p is ComissaoTecnicaRow => Boolean(p));
  const staffConvocado = ((csData ?? []) as (ConvocacaoStaffRow & { pessoa: StaffOperacionalComFuncaoRow | null })[])
    .map((c) => c.pessoa)
    .filter((p): p is StaffOperacionalComFuncaoRow => Boolean(p));

  let atletasConvocados: AtletaRow[] = [];
  if (convocacaoAtletaIds.length > 0) {
    const { data: atletasData } = await supabase.from("atletas").select("*").in("id", convocacaoAtletaIds);
    atletasConvocados = (atletasData ?? []) as AtletaRow[];
  }

  // Rooming list
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

  // Ônibus
  const onibusRows = (onibusData ?? []) as OnibusListaRow[];
  let onibusIniciais: OnibusInicial[] = [];
  if (onibusRows.length > 0) {
    const onibusIds = onibusRows.map((o) => o.id);
    const { data: passageirosData } = await supabase
      .from("onibus_passageiros")
      .select("*")
      .in("onibus_lista_id", onibusIds);
    const passageiros = (passageirosData ?? []) as OnibusPassageiroRow[];
    onibusIniciais = onibusRows.map((o) => ({
      horario: o.horario_saida ? o.horario_saida.slice(0, 5) : "",
      passageiros: passageiros
        .filter((p) => p.onibus_lista_id === o.id)
        .map((p) => ({ pessoaTipo: p.pessoa_tipo, pessoaId: p.pessoa_id })),
    }));
  }

  // Credenciamento
  const catalogo = (catalogoData ?? []) as CredenciamentoCatalogoRow[];
  const credenciamentoRows = (credenciamentoData ?? []) as CredenciamentoJogoRow[];
  const atribuicoesAtuais: CredenciamentoAtual[] = credenciamentoRows.map((c) => ({
    pessoaTipo: c.pessoa_tipo,
    pessoaId: c.pessoa_id,
    catalogoId: c.credenciamento_catalogo_id,
    vagaExtra: c.vaga_extra,
  }));
  const usoPorCatalogo: Record<string, number> = {};
  for (const c of credenciamentoRows) {
    if (c.vaga_extra) continue;
    usoPorCatalogo[c.credenciamento_catalogo_id] = (usoPorCatalogo[c.credenciamento_catalogo_id] ?? 0) + 1;
  }

  const temRoomingList = quartosIniciais.length > 0;
  const temOnibus = onibusIniciais.some((o) => o.passageiros.length > 0);
  const temCredenciamento = atribuicoesAtuais.length > 0;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="logistica" />

      <div className="card mb-4 p-4">
        <p className="text-sm text-neutral-600">
          <span className="font-semibold text-grena-escuro">
            {jogo.mandante ? "Juventus" : jogo.adversario_nome}
          </span>{" "}
          x{" "}
          <span className="font-semibold text-grena-escuro">
            {jogo.mandante ? jogo.adversario_nome : "Juventus"}
          </span>{" "}
          — {jogo.competicao}
          {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""}
          {" · "}
          {jogo.mandante ? "Jogo em casa" : "Jogo fora"}
        </p>
      </div>

      <div className="space-y-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-grena-escuro">Rooming List</h2>
            {temRoomingList ? (
              <a
                href={`/jogos/${jogo.id}/logistica/rooming-list/pdf`}
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
            comissao={comissaoConvocada}
            staff={staffConvocado}
            hotelNomeInicial={roomingList?.hotel_nome ?? ""}
            hotelEnderecoInicial={roomingList?.hotel_endereco ?? ""}
            checkinInicial={roomingList?.checkin ?? ""}
            checkoutInicial={roomingList?.checkout ?? ""}
            quartosIniciais={quartosIniciais}
          />
        </section>

        <section className="space-y-3 border-t border-neutral-200 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-grena-escuro">Lista de Passageiros do Ônibus</h2>
            {temOnibus ? (
              <a
                href={`/jogos/${jogo.id}/logistica/onibus/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Gerar PDF
              </a>
            ) : (
              <span className="text-xs text-neutral-400">Salve ao menos um ônibus com passageiros para liberar o PDF.</span>
            )}
          </div>
          <OnibusForm
            action={saveOnibus}
            jogoId={jogo.id}
            atletas={atletasConvocados}
            comissao={comissaoConvocada}
            staff={staffConvocado}
            onibusIniciais={onibusIniciais}
          />
        </section>

        <section className="space-y-3 border-t border-neutral-200 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-grena-escuro">Credenciamento por Zona</h2>
            {temCredenciamento ? (
              <a
                href={`/jogos/${jogo.id}/logistica/credenciamento/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Gerar PDF
              </a>
            ) : (
              <span className="text-xs text-neutral-400">Credencie ao menos uma pessoa para liberar o PDF.</span>
            )}
          </div>
          <CredenciamentoForm
            action={saveCredenciamento}
            jogoId={jogo.id}
            comissao={comissaoConvocada}
            staff={staffConvocado}
            catalogo={catalogo}
            atribuicoesAtuais={atribuicoesAtuais}
            usoPorCatalogo={usoPorCatalogo}
          />
        </section>
      </div>
    </AppShell>
  );
}
