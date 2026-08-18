import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { criarSuspensaoManual, excluirSuspensaoManual } from "../../actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Suspensões da competição — principalmente uma tela de CONTROLE (spec, item 10): as automáticas
 * são geradas pelo motor de regras a partir das súmulas (3º amarelo, vermelho, 2 amarelos no
 * jogo) e não têm cadastro. Só a suspensão MANUAL (decisão disciplinar externa, ex.: TJD) é
 * registrada aqui.
 */
export default async function CompeticaoSuspensoesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, disciplina, atletasById, jogosOrdenados, inscricoes } = carregada;

  const criarAction = criarSuspensaoManual.bind(null, competicao.id);
  const excluirAction = excluirSuspensaoManual.bind(null, competicao.id);

  const confrontoPorJogo = new Map(jogosOrdenados.map((j) => [j.jogoId, j.confronto]));
  const suspensoes = [...disciplina.suspensoes].sort((a, b) => {
    if (a.status !== b.status) return a.status === "ativa" ? -1 : 1;
    return b.dataInicio.localeCompare(a.dataInicio);
  });

  const atletasOpcoes = Array.from(
    new Map(
      [...inscricoes.map((i) => i.atleta_id), ...disciplina.cartoes.map((c) => c.atletaId)].map((id) => [
        id,
        atletasById.get(id),
      ]),
    ).values(),
  )
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"));

  const ORIGEM_LABEL = { cartao: "Cartão", decisao_disciplinar: "Decisão disciplinar", outro: "Outro" } as const;

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="suspensoes" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">Suspensões</h2>
        <a href={`/competicoes/${competicao.id}/suspensoes/pdf`} target="_blank" className="btn-secondary">
          Gerar PDF
        </a>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Suspensões por cartão são geradas automaticamente pelo motor de regras — ninguém precisa cadastrar.
        O registro manual abaixo é só pra casos externos (ex.: decisão do tribunal).
      </p>

      <div className="card tabela-rolavel mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-3">Atleta</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Motivo / Origem</th>
              <th className="px-3 py-3">Jogo de origem</th>
              <th className="px-3 py-3 text-center">Jogos</th>
              <th className="px-3 py-3 text-center">Cumpridos</th>
              <th className="px-3 py-3 text-center">Restantes</th>
              <th className="px-3 py-3">Próximo jogo</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {suspensoes.map((s, i) => {
              const atleta = atletasById.get(s.atletaId);
              return (
                <tr key={`${s.atletaId}-${i}`}>
                  <td className="px-3 py-3 font-medium text-neutral-800">{atleta?.nome_completo ?? "Atleta"}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.tipo === "automatica" ? "bg-dourado/10 text-dourado" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {s.tipo === "automatica" ? "Automática" : "Manual"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-neutral-700">
                    {s.motivo}
                    {s.tipo === "manual" ? (
                      <span className="block text-xs text-neutral-400">{ORIGEM_LABEL[s.origem]}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-neutral-600">
                    {s.jogoOrigemId ? confrontoPorJogo.get(s.jogoOrigemId) ?? "—" : `Decisão de ${formatData(s.dataInicio)}`}
                  </td>
                  <td className="px-3 py-3 text-center">{s.jogosSuspensao}</td>
                  <td className="px-3 py-3 text-center text-neutral-600">{s.jogosCumpridos}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={s.jogosRestantes > 0 ? "font-semibold text-red-700" : "text-neutral-400"}>
                      {s.jogosRestantes}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-neutral-600">
                    {s.proximoJogoCumprirId
                      ? confrontoPorJogo.get(s.proximoJogoCumprirId) ?? "—"
                      : s.status === "ativa"
                        ? "Aguardando próximo jogo vinculado"
                        : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        s.status === "ativa" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {s.status === "ativa" ? "Ativa" : "Cumprida"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {s.manualId ? (
                      <form action={excluirAction}>
                        <input type="hidden" name="id" value={s.manualId} />
                        <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                          Excluir
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {suspensoes.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma suspensão na competição. Elas aparecem sozinhas quando as súmulas registrarem
                  cartões suficientes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="card mt-6 p-5">
        <h3 className="text-base font-bold text-grena-escuro">Registrar suspensão manual</h3>
        <p className="mt-1 text-xs text-neutral-400">
          Só pra suspensão que NÃO vem de cartão (decisão disciplinar externa). As de cartão o motor gera
          sozinho.
        </p>
        {atletasOpcoes.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Inscreva atletas na competição primeiro.</p>
        ) : (
          <form action={criarAction} className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[200px]">
              <label htmlFor="atletaId" className="field-label">
                Atleta
              </label>
              <select id="atletaId" name="atletaId" className="field-input" required>
                {atletasOpcoes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome_completo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="origem" className="field-label">
                Origem
              </label>
              <select id="origem" name="origem" className="field-input" defaultValue="decisao_disciplinar">
                <option value="decisao_disciplinar">Decisão disciplinar</option>
                <option value="cartao">Cartão</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label htmlFor="motivo" className="field-label">
                Motivo
              </label>
              <input id="motivo" name="motivo" className="field-input" placeholder="Ex.: Punição do TJD" required />
            </div>
            <div>
              <label htmlFor="jogosSuspensao" className="field-label">
                Jogos
              </label>
              <input
                id="jogosSuspensao"
                name="jogosSuspensao"
                type="number"
                min={1}
                defaultValue={1}
                className="field-input w-20"
              />
            </div>
            <div>
              <label htmlFor="dataDecisao" className="field-label">
                Data da decisão
              </label>
              <input id="dataDecisao" name="dataDecisao" type="date" className="field-input" />
            </div>
            <button type="submit" className="btn-primary">
              Registrar
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
