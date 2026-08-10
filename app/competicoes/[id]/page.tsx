import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { DeleteButton } from "@/components/delete-button";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getSignedCompeticaoDocumentoUrl } from "@/lib/supabase/storage";
import { hojeBrasilia } from "@/lib/data-brasil";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { avisosDaCompeticao } from "@/lib/futebol/competicao-avisos";
import { excluirCompeticao } from "../actions";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function CompeticaoVisaoGeralPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, fases, disciplina, inscricoes, jogosOrdenados, prazos } = carregada;
  const hojeStr = hojeBrasilia();

  const suspensosAtivos = disciplina.suspensoes.filter((s) => s.status === "ativa");
  const proximoJogo = jogosOrdenados.find((j) => j.data >= hojeStr) ?? null;
  const alertas = avisosDaCompeticao(carregada, hojeStr).slice(0, 5);
  const regulamentoUrl = await getSignedCompeticaoDocumentoUrl(supabase, competicao.regulamento_path);

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="visao" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fases" valor={fases.length} />
        <StatCard label="Jogos vinculados" valor={jogosOrdenados.length} />
        <StatCard label="Atletas inscritos" valor={inscricoes.length} />
        <StatCard
          label="Suspensos"
          valor={suspensosAtivos.length}
          destaque={suspensosAtivos.length > 0 ? "text-red-700" : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-grena-escuro">Dados da competição</h2>
            <div className="flex gap-2">
              <a href={`/competicoes/${competicao.id}/pdf`} target="_blank" className="btn-secondary text-xs">
                Resumo em PDF
              </a>
              <Link href={`/competicoes/${competicao.id}/editar`} className="btn-secondary text-xs">
                Editar
              </Link>
            </div>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Nome</dt>
              <dd className="font-medium text-neutral-800">{competicao.nome}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Temporada</dt>
              <dd className="text-neutral-800">{competicao.temporada?.nome ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Federação/Organização</dt>
              <dd className="text-neutral-800">{competicao.federacao ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Categoria</dt>
              <dd className="text-neutral-800">{competicao.categoria}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Período</dt>
              <dd className="text-neutral-800">
                {formatData(competicao.data_inicio)} — {formatData(competicao.data_termino)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Regulamento</dt>
              <dd>
                {regulamentoUrl ? (
                  <a
                    href={regulamentoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-grena hover:underline"
                  >
                    Abrir PDF
                  </a>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Regras disciplinares</dt>
              <dd className="text-right text-neutral-800">
                {competicao.regra_amarelos_suspensao} amarelos → {competicao.regra_jogos_suspensao_amarelos}{" "}
                {competicao.regra_jogos_suspensao_amarelos === 1 ? "jogo" : "jogos"} · vermelho →{" "}
                {competicao.regra_jogos_suspensao_vermelho}{" "}
                {competicao.regra_jogos_suspensao_vermelho === 1 ? "jogo" : "jogos"}
              </dd>
            </div>
            {competicao.observacoes ? (
              <div>
                <dt className="text-neutral-500">Observações</dt>
                <dd className="mt-1 whitespace-pre-wrap text-neutral-700">{competicao.observacoes}</dd>
              </div>
            ) : null}
            {competicao.regra_observacoes ? (
              <div>
                <dt className="text-neutral-500">Regulamento — regras disciplinares</dt>
                <dd className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
                  {competicao.regra_observacoes}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-base font-bold text-grena-escuro">Alertas recentes</h2>
            {alertas.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">Nenhum alerta no momento.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {alertas.map((a, i) => (
                  <Link
                    key={i}
                    href={a.href ?? `/competicoes/${competicao.id}/alertas`}
                    className="flex items-start gap-2 rounded-md border border-linha p-3 text-sm transition-colors hover:bg-neutral-50"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                    <span>
                      <span className="font-medium text-neutral-800">{a.titulo}</span>
                      {a.subtitulo ? <span className="block text-xs text-neutral-500">{a.subtitulo}</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-base font-bold text-grena-escuro">Como os dados chegam aqui</h2>
            <p className="mt-2 text-xs font-medium text-neutral-500">
              Súmula → Cartões → Regras da competição → Suspensão → Condição de jogo → Alerta
            </p>
            <p className="mt-2 text-xs text-neutral-400">
              Nada é cadastrado duas vezes: a competição só organiza e processa o que já existe em Jogos e
              Súmulas.{proximoJogo ? ` Próximo jogo vinculado: ${proximoJogo.confronto}.` : ""}
            </p>
          </section>

          {prazos.filter((p) => !p.concluido).length > 0 ? (
            <section className="card p-5">
              <h2 className="text-base font-bold text-grena-escuro">Prazos em aberto</h2>
              <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                {prazos
                  .filter((p) => !p.concluido)
                  .slice(0, 4)
                  .map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span>{p.titulo}</span>
                      <span className="text-neutral-500">{formatData(p.data_fim)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex justify-end border-t border-linha pt-4">
        <DeleteButton action={excluirCompeticao} id={competicao.id} entityLabel="competição" />
      </div>
    </AppShell>
  );
}
