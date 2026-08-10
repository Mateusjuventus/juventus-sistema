import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { condicaoDoAtleta } from "@/lib/futebol/competicao-disciplina";
import { hojeBrasilia } from "@/lib/data-brasil";
import { inscreverAtleta, removerInscricao } from "../../actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const SITUACAO_BADGE = {
  apto: { label: "Apto", classe: "bg-emerald-50 text-emerald-700" },
  atencao: { label: "Atenção", classe: "bg-amber-50 text-amber-700" },
  suspenso: { label: "Suspenso", classe: "bg-red-50 text-red-700" },
  irregular: { label: "Irregular", classe: "bg-red-50 text-red-700" },
} as const;

/** Atletas inscritos na competição (com lista A/B quando o regulamento usa). A situação de cada um
 * é derivada da disciplina (súmulas → motor de regras) considerando o próximo jogo vinculado. */
export default async function CompeticaoInscritosPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, inscricoes, atletasById, disciplina, jogosOrdenados } = carregada;
  const hojeStr = hojeBrasilia();
  const proximoJogo = jogosOrdenados.find((j) => j.data >= hojeStr) ?? null;

  const { data: atletasData } = await supabase
    .from("atletas")
    .select("id, nome_completo, posicao")
    .order("nome_completo", { ascending: true });
  const todosAtletas = (atletasData ?? []) as { id: string; nome_completo: string; posicao: string | null }[];
  const inscritosIds = new Set(inscricoes.map((i) => i.atleta_id));
  const naoInscritos = todosAtletas.filter((a) => !inscritosIds.has(a.id));

  const inscreverAction = inscreverAtleta.bind(null, competicao.id);
  const removerAction = removerInscricao.bind(null, competicao.id);

  const ordenadas = [...inscricoes].sort((a, b) => {
    const na = atletasById.get(a.atleta_id)?.nome_completo ?? "";
    const nb = atletasById.get(b.atleta_id)?.nome_completo ?? "";
    return na.localeCompare(nb, "pt-BR");
  });

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="inscritos" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">Atletas inscritos ({inscricoes.length})</h2>
        <div className="flex items-end gap-2">
          <a href={`/competicoes/${competicao.id}/inscritos/pdf`} target="_blank" className="btn-secondary">
            Gerar PDF
          </a>
          {naoInscritos.length > 0 ? (
            <form action={inscreverAction} className="flex items-end gap-2">
              <div>
                <label htmlFor="atletaId" className="field-label">
                  Inscrever atleta
                </label>
                <select id="atletaId" name="atletaId" className="field-input w-56">
                  {naoInscritos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lista" className="field-label">
                  Lista
                </label>
                <select id="lista" name="lista" className="field-input w-24">
                  <option value="">—</option>
                  <option value="A">Lista A</option>
                  <option value="B">Lista B</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">
                + Inscrever
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Atleta</th>
              <th className="px-4 py-3">Posição</th>
              <th className="px-4 py-3">Lista</th>
              <th className="px-4 py-3">Inscrição</th>
              <th className="px-4 py-3">Situação{proximoJogo ? ` (p/ ${proximoJogo.confronto})` : ""}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {ordenadas.map((inscricao) => {
              const atleta = atletasById.get(inscricao.atleta_id);
              const condicao = proximoJogo
                ? condicaoDoAtleta(inscricao.atleta_id, proximoJogo.jogoId, true, disciplina)
                : null;
              const badge = condicao ? SITUACAO_BADGE[condicao.status] : null;
              return (
                <tr key={inscricao.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    {atleta?.nome_completo ?? "Atleta removido"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{atleta?.posicao ?? "—"}</td>
                  <td className="px-4 py-3">
                    {inscricao.lista ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                        Lista {inscricao.lista}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatData(inscricao.data_inscricao)}</td>
                  <td className="px-4 py-3">
                    {badge ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classe}`}
                        title={condicao?.detalhe}
                      >
                        {badge.label}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={removerAction}>
                      <input type="hidden" name="id" value={inscricao.id} />
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                        Remover
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {ordenadas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum atleta inscrito ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
