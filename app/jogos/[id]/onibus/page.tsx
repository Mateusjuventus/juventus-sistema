import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { AtletaRow, ComissaoTecnicaRow, OnibusListaRow, OnibusPassageiroRow } from "@/lib/supabase/types";
import { getJogoEConvocados } from "../operacao-data";
import { OnibusForm, type PessoaOnibus } from "./onibus-form";
import { saveOnibus } from "../operacao-actions";

function paraPessoa(a: { id: string; nome_completo: string }, extra: string): PessoaOnibus {
  return { id: a.id, nome: a.nome_completo, extra };
}

export default async function OnibusPage({ params }: { params: { id: string } }) {
  const dados = await getJogoEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, atletas, comissao } = dados;

  if (!convocacao) {
    return (
      <AppShell>
        <JogoTabs jogoId={jogo.id} active="onibus" />
        <AvisoSemConvocacao jogoId={jogo.id} />
      </AppShell>
    );
  }

  const supabase = createClient();

  const [{ data: todosAtletasData }, { data: todaComissaoData }, { data: onibusData }] = await Promise.all([
    supabase.from("atletas").select("id, nome_completo, posicao").order("nome_completo", { ascending: true }),
    supabase.from("comissao_tecnica").select("id, nome_completo, funcao").order("nome_completo", { ascending: true }),
    supabase.from("onibus_lista").select("*").eq("jogo_id", jogo.id).eq("onibus_numero", 1).maybeSingle(),
  ]);

  const todosAtletas = (todosAtletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "posicao">[];
  const todaComissao = (todaComissaoData ?? []) as Pick<ComissaoTecnicaRow, "id" | "nome_completo" | "funcao">[];
  const onibus = onibusData as OnibusListaRow | null;

  let passageiros: OnibusPassageiroRow[] = [];
  if (onibus) {
    const { data } = await supabase.from("onibus_passageiros").select("*").eq("onibus_lista_id", onibus.id);
    passageiros = (data ?? []) as OnibusPassageiroRow[];
  }

  const convocadoAtletaIds = new Set(atletas.map((a) => a.id));
  const convocadoComissaoIds = new Set(comissao.map((c) => c.id));

  const extrasAtletaIds = new Set(
    passageiros.filter((p) => p.pessoa_tipo === "atleta" && !convocadoAtletaIds.has(p.pessoa_id)).map((p) => p.pessoa_id),
  );
  const extrasComissaoIds = new Set(
    passageiros
      .filter((p) => p.pessoa_tipo === "comissao" && !convocadoComissaoIds.has(p.pessoa_id))
      .map((p) => p.pessoa_id),
  );

  const incluidos = passageiros.map((p) => `${p.pessoa_tipo}:${p.pessoa_id}`);

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="onibus" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Lista de Passageiros do Ônibus</h1>
        {onibus && passageiros.length > 0 ? (
          <a
            href={`/jogos/${jogo.id}/onibus/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Gerar PDF
          </a>
        ) : (
          <span className="text-xs text-neutral-400">Salve a lista com ao menos um passageiro para liberar o PDF.</span>
        )}
      </div>

      <OnibusForm
        action={saveOnibus}
        jogoId={jogo.id}
        atletasConvocados={atletas.map((a) => paraPessoa(a, a.posicao))}
        comissaoConvocados={comissao.map((c) => paraPessoa(c, c.funcao))}
        atletasTodos={todosAtletas.map((a) => paraPessoa(a, a.posicao))}
        comissaoTodos={todaComissao.map((c) => paraPessoa(c, c.funcao))}
        extrasAtletasIniciais={todosAtletas.filter((a) => extrasAtletaIds.has(a.id)).map((a) => paraPessoa(a, a.posicao))}
        extrasComissaoIniciais={todaComissao.filter((c) => extrasComissaoIds.has(c.id)).map((c) => paraPessoa(c, c.funcao))}
        existeRegistro={Boolean(onibus)}
        incluidosIniciais={incluidos}
        horarioInicial={onibus?.horario_saida ? onibus.horario_saida.slice(0, 5) : ""}
      />
    </AppShell>
  );
}
