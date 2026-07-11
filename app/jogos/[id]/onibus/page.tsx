import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { OnibusListaRow, OnibusPassageiroRow } from "@/lib/supabase/types";
import { getJogoEConvocados } from "../operacao-data";
import { OnibusForm, type OnibusInicial } from "./onibus-form";
import { saveOnibus } from "../operacao-actions";

export default async function OnibusPage({ params }: { params: { id: string } }) {
  const dados = await getJogoEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, atletas, comissao, staff } = dados;

  if (!convocacao) {
    return (
      <AppShell>
        <JogoTabs jogoId={jogo.id} active="onibus" />
        <AvisoSemConvocacao jogoId={jogo.id} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: onibusData } = await supabase
    .from("onibus_lista")
    .select("*")
    .eq("jogo_id", jogo.id)
    .order("onibus_numero", { ascending: true });
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

  const temOnibus = onibusIniciais.some((o) => o.passageiros.length > 0);

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="onibus" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Lista de Passageiros do Ônibus</h1>
        {temOnibus ? (
          <a
            href={`/jogos/${jogo.id}/onibus/pdf`}
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

      <OnibusForm
        action={saveOnibus}
        jogoId={jogo.id}
        atletas={atletas}
        comissao={comissao}
        staff={staff}
        onibusIniciais={onibusIniciais}
      />
    </AppShell>
  );
}
