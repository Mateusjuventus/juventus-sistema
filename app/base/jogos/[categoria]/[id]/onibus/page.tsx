import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { OnibusListaBaseRow, OnibusPassageiroBaseRow } from "@/lib/supabase/types";
import { getJogoBaseEConvocados } from "../operacao-data";
import { OnibusFormBase, type OnibusInicial } from "./onibus-form-base";
import { saveOnibusBase } from "../operacao-actions";

/** Espelha `app/jogos/[id]/onibus/page.tsx` para o Futebol de Base. */
export default async function OnibusBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const dados = await getJogoBaseEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, atletas, comissao, staff } = dados;

  if (!convocacao) {
    return (
      <AppShell departamento="futebol_base">
        <JogoTabsBase jogoId={jogo.id} categoria={categoria} active="onibus" />
        <AvisoSemConvocacao jogoId={jogo.id} convocacaoHref={`/base/jogos/${categoria}/${jogo.id}/convocacao`} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: onibusData } = await supabase
    .from("onibus_lista_base")
    .select("*")
    .eq("jogo_id", jogo.id)
    .order("onibus_numero", { ascending: true });
  const onibusRows = (onibusData ?? []) as OnibusListaBaseRow[];

  let onibusIniciais: OnibusInicial[] = [];
  if (onibusRows.length > 0) {
    const onibusIds = onibusRows.map((o) => o.id);
    const { data: passageirosData } = await supabase
      .from("onibus_passageiros_base")
      .select("*")
      .in("onibus_lista_id", onibusIds);
    const passageiros = (passageirosData ?? []) as OnibusPassageiroBaseRow[];
    onibusIniciais = onibusRows.map((o) => ({
      horario: o.horario_saida ? o.horario_saida.slice(0, 5) : "",
      passageiros: passageiros
        .filter((p) => p.onibus_lista_id === o.id)
        .map((p) => ({ pessoaTipo: p.pessoa_tipo, pessoaId: p.pessoa_id })),
    }));
  }

  const temOnibus = onibusIniciais.some((o) => o.passageiros.length > 0);

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} categoria={categoria} active="onibus" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Lista de Passageiros do Ônibus</h1>
        {temOnibus ? (
          <a
            href={`/base/jogos/${categoria}/${jogo.id}/onibus/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Gerar PDF
          </a>
        ) : (
          <span className="text-xs text-neutral-400">
            Salve ao menos um ônibus com passageiros para liberar o PDF.
          </span>
        )}
      </div>

      <OnibusFormBase
        action={saveOnibusBase}
        jogoId={jogo.id}
        atletas={atletas}
        comissao={comissao}
        staff={staff}
        onibusIniciais={onibusIniciais}
      />
    </AppShell>
  );
}
