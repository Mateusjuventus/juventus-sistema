import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { CredenciamentoCatalogoRow, CredenciamentoJogoRow } from "@/lib/supabase/types";
import { getJogoEConvocados } from "../operacao-data";
import { CredenciamentoForm, type CredenciamentoAtual } from "./credenciamento-form";
import { saveCredenciamento } from "../operacao-actions";

export default async function CredenciamentoPage({ params }: { params: { id: string } }) {
  const dados = await getJogoEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, comissao, staff } = dados;

  if (!convocacao) {
    return (
      <AppShell>
        <JogoTabs jogoId={jogo.id} active="credenciamento" />
        <AvisoSemConvocacao jogoId={jogo.id} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const [{ data: catalogoData }, { data: credenciamentoData }] = await Promise.all([
    supabase.from("credenciamento_catalogo").select("*").order("zona", { ascending: true }),
    supabase.from("credenciamento_jogo").select("*").eq("jogo_id", jogo.id),
  ]);

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

  const temCredenciamento = atribuicoesAtuais.length > 0;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="credenciamento" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Credenciamento por Zona</h1>
        {temCredenciamento ? (
          <a
            href={`/jogos/${jogo.id}/credenciamento/pdf`}
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
        comissao={comissao}
        staff={staff}
        catalogo={catalogo}
        atribuicoesAtuais={atribuicoesAtuais}
        usoPorCatalogo={usoPorCatalogo}
      />
    </AppShell>
  );
}
