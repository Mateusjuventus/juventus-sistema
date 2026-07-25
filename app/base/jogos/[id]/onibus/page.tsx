import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  OnibusListaBaseRow,
  OnibusPassageiroBaseRow,
} from "@/lib/supabase/types";
import { getJogoBaseEConvocados } from "../operacao-data";
import { OnibusFormBase, type PessoaOnibus } from "./onibus-form-base";
import { saveOnibusBase } from "../operacao-actions";

function paraPessoa(a: { id: string; nome_completo: string }, extra: string): PessoaOnibus {
  return { id: a.id, nome: a.nome_completo, extra };
}

/** Espelha `app/jogos/[id]/onibus/page.tsx` para o Futebol de Base. */
export default async function OnibusBasePage({ params }: { params: { id: string } }) {
  const dados = await getJogoBaseEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, atletas, comissao } = dados;

  if (!convocacao) {
    return (
      <AppShell departamento="futebol_base">
        <JogoTabsBase jogoId={jogo.id} active="onibus" />
        <AvisoSemConvocacao jogoId={jogo.id} convocacaoHref={`/base/jogos/${jogo.id}/convocacao`} />
      </AppShell>
    );
  }

  const supabase = createClient();

  const [{ data: todosAtletasData }, { data: todaComissaoData }, { data: onibusData }] = await Promise.all([
    supabase
      .from("atletas_base")
      .select("id, nome_completo, posicao")
      .order("nome_completo", { ascending: true }),
    supabase
      .from("comissao_tecnica_base")
      .select("id, nome_completo, funcao")
      .order("nome_completo", { ascending: true }),
    supabase.from("onibus_lista_base").select("*").eq("jogo_id", jogo.id).eq("onibus_numero", 1).maybeSingle(),
  ]);

  const todosAtletas = (todosAtletasData ?? []) as Pick<AtletaBaseRow, "id" | "nome_completo" | "posicao">[];
  const todaComissao = (todaComissaoData ?? []) as Pick<ComissaoTecnicaBaseRow, "id" | "nome_completo" | "funcao">[];
  const onibus = onibusData as OnibusListaBaseRow | null;

  let passageiros: OnibusPassageiroBaseRow[] = [];
  if (onibus) {
    const { data } = await supabase.from("onibus_passageiros_base").select("*").eq("onibus_lista_id", onibus.id);
    passageiros = (data ?? []) as OnibusPassageiroBaseRow[];
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
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="onibus" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Lista de Passageiros do Ônibus</h1>
        {onibus && passageiros.length > 0 ? (
          <a
            href={`/base/jogos/${jogo.id}/onibus/pdf`}
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

      <OnibusFormBase
        action={saveOnibusBase}
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
