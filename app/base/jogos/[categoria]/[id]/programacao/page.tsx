import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { JogoBaseRow, JogoProgramacaoItemBaseRow } from "@/lib/supabase/types";
import { buildConfrontoTexto } from "@/lib/posters/jogo-texto";
import {
  adicionarItemProgramacaoBase,
  removerItemProgramacaoBase,
  salvarConfigConcentracaoBase,
  salvarConfigDiaJogoBase,
} from "./actions";
import { ProgramacaoLinhaForm } from "./programacao-linha-form";

function LinhaProgramacao({
  item,
  confrontoTexto,
}: {
  item: JogoProgramacaoItemBaseRow;
  confrontoTexto: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">
      <span className="w-24 shrink-0 font-semibold text-grena-escuro">{item.horario}</span>
      <span className="min-w-[160px] flex-1 font-medium text-neutral-800">
        {item.eh_confronto ? confrontoTexto : item.atividade}
      </span>
      <span className="min-w-[120px] flex-1 text-neutral-600">{item.local}</span>
      <DeleteButton action={removerItemProgramacaoBase} id={item.id} entityLabel="item da programação" />
    </div>
  );
}

/** Espelha `app/jogos/[id]/programacao/page.tsx` para o Futebol de Base. */
export default async function ProgramacaoBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;
  const supabase = createClient();

  const [{ data: jogoData }, { data: itensData }] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("id", params.id).single(),
    supabase
      .from("jogo_programacao_itens_base")
      .select("*")
      .eq("jogo_id", params.id)
      .order("ordem", { ascending: true }),
  ]);

  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;
  const itens = (itensData ?? []) as JogoProgramacaoItemBaseRow[];

  const itensConcentracao = itens.filter((i) => i.tipo === "concentracao");
  const itensDiaJogo = itens.filter((i) => i.tipo === "dia_jogo");
  const confrontoTexto = buildConfrontoTexto(jogo);

  const concentracaoLiberada = Boolean(jogo.concentracao_data) && itensConcentracao.length > 0;
  const diaJogoLiberado = itensDiaJogo.length > 0;

  const base = `/base/jogos/${categoria}/${jogo.id}`;

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} categoria={categoria} active="programacao" />

      <div className="space-y-6">
        {/* Concentração */}
        <section className="card p-4">
          <h2 className="text-lg font-bold text-grena-escuro">Concentração</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cronograma do dia da concentração (pode ser diferente do dia do jogo) e as orientações
            que aparecem no pé do pôster.
          </p>

          <form action={salvarConfigConcentracaoBase} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="jogoId" value={jogo.id} />
            <div>
              <label className="field-label">Data da concentração</label>
              <input
                type="date"
                name="concentracaoData"
                defaultValue={jogo.concentracao_data ?? ""}
                className="field-input"
              />
            </div>
            <div className="min-w-[280px] flex-1">
              <label className="field-label">Orientações de concentração (uma regra por linha)</label>
              <textarea
                name="concentracaoRegras"
                defaultValue={jogo.concentracao_regras}
                rows={5}
                className="field-input"
              />
            </div>
            <button type="submit" className="btn-secondary">
              Salvar
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {itensConcentracao.map((item) => (
              <LinhaProgramacao key={item.id} item={item} confrontoTexto={confrontoTexto} />
            ))}
            {itensConcentracao.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhuma linha adicionada ainda.</p>
            ) : null}
          </div>

          <div className="mt-3">
            <ProgramacaoLinhaForm action={adicionarItemProgramacaoBase} jogoId={jogo.id} tipo="concentracao" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {concentracaoLiberada ? (
              <>
                <a
                  href={`${base}/programacao/concentracao/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Gerar Concentração (PDF)
                </a>
                <a
                  href={`${base}/programacao/concentracao/jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Gerar Concentração (JPG)
                </a>
              </>
            ) : (
              <span className="text-xs text-neutral-400">
                Preencha a data da concentração e adicione ao menos uma linha pra liberar a geração.
              </span>
            )}
          </div>
        </section>

        {/* Dia de Jogo */}
        <section className="card p-4">
          <h2 className="text-lg font-bold text-grena-escuro">Dia de Jogo</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cronograma do dia do jogo (a data usada é sempre a data do jogo) e a frase de liberação
            que aparece no fim do pôster.
          </p>

          <form action={salvarConfigDiaJogoBase} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="jogoId" value={jogo.id} />
            <div className="min-w-[280px] flex-1">
              <label className="field-label">Frase de liberação</label>
              <input
                type="text"
                name="diaJogoLiberacao"
                placeholder="Ex.: Atletas liberados após o almoço!"
                defaultValue={jogo.dia_jogo_liberacao ?? ""}
                className="field-input"
              />
            </div>
            <button type="submit" className="btn-secondary">
              Salvar
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {itensDiaJogo.map((item) => (
              <LinhaProgramacao key={item.id} item={item} confrontoTexto={confrontoTexto} />
            ))}
            {itensDiaJogo.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhuma linha adicionada ainda.</p>
            ) : null}
          </div>

          <div className="mt-3">
            <ProgramacaoLinhaForm
              action={adicionarItemProgramacaoBase}
              jogoId={jogo.id}
              tipo="dia_jogo"
              mostrarConfronto
              confrontoTexto={confrontoTexto}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {diaJogoLiberado ? (
              <>
                <a
                  href={`${base}/programacao/dia-jogo/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Gerar Dia de Jogo (PDF)
                </a>
                <a
                  href={`${base}/programacao/dia-jogo/jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Gerar Dia de Jogo (JPG)
                </a>
              </>
            ) : (
              <span className="text-xs text-neutral-400">
                Adicione ao menos uma linha pra liberar a geração.
              </span>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
