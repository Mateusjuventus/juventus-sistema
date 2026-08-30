import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { TreinadorHeader } from "@/components/treinador/treinador-header";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { logout } from "@/app/actions";
import { captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { bordaClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";
import { ClassificacaoSelectTreinador } from "@/components/classificacao-select-treinador";
import { buscarNotificacoes } from "@/lib/notificacoes/actions";
import { salvarClassificacaoTreinador } from "./actions";
import type { AtletaBaseRow, CaptacaoBaseRow } from "@/lib/supabase/types";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Aba "Atletas" da Área do Treinador — candidatos "Em avaliação" (Captação) das categorias do
 * treinador + o elenco já do clube ("Meus atletas"), com classificação G1/G2/G3 e Relatório de
 * Dispensa. Era a tela inteira de `/treinador` antes da Fase 4 (3 abas) do plano de implementação
 * — só mudou de endereço, o conteúdo é o mesmo de sempre.
 */
export default async function TreinadorAtletasPage() {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  const notificacoes = await buscarNotificacoes();

  if (categorias.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-pagina px-4 py-10">
        <JuventusCrestMark className="h-12 w-12" />
        <p className="mt-4 max-w-sm text-center text-neutral-600">
          Você ainda não tem nenhuma categoria vinculada ao seu acesso. Fale com o responsável do
          Futebol de Base.
        </p>
        <form action={logout} className="mt-4">
          <button type="submit" className="btn-secondary btn-sm">
            Sair
          </button>
        </form>
      </main>
    );
  }

  const { data: pendentesData } = await supabase
    .from("captacao_base")
    .select("*")
    .in("categoria", categorias)
    .eq("status", "avaliacao")
    .order("data_inicio", { ascending: true });
  const pendentes = (pendentesData ?? []) as CaptacaoBaseRow[];

  const { data: decididosData } = await supabase
    .from("captacao_base")
    .select("*")
    .in("categoria", categorias)
    .in("status", ["aprovado", "dispensado", "nao_compareceu"])
    .order("data_termino", { ascending: false });
  const decididos = (decididosData ?? []) as CaptacaoBaseRow[];

  // "Meus atletas" (ver docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-
  // design.md, seção 2) — o elenco já do clube (atletas_base) das categorias do treinador, à parte
  // da fila de candidatos da Captação acima. Dispensados não aparecem aqui, mesmo raciocínio da
  // listagem interna (só quem está ativo no elenco).
  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("*")
    .in("categoria", categorias)
    .neq("status", "dispensado")
    .order("nome_completo", { ascending: true });
  const atletas = (atletasData ?? []) as AtletaBaseRow[];

  return (
    <div className="min-h-screen bg-pagina">
      <TreinadorHeader categorias={categorias} notificacoes={notificacoes} active="atletas" />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Aguardando avaliação</p>
            <p className="mt-1 text-2xl font-bold text-grena-escuro">{pendentes.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Já avaliados</p>
            <p className="mt-1 text-2xl font-bold text-grena-escuro">{decididos.length}</p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Aguardando avaliação
          </h2>
          {pendentes.length === 0 ? (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
              Nenhum candidato aguardando avaliação no momento.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pendentes.map((candidato) => (
                <Link
                  key={candidato.id}
                  href={`/treinador/${candidato.id}`}
                  className="card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-dourado"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grena/10 text-sm font-bold text-grena-escuro">
                    {candidato.numero}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-800">
                      {candidato.nome_completo}
                      {candidato.categoria ? (
                        <span className="ml-2 text-sm font-normal text-neutral-500">
                          {categoriaBaseLabel(candidato.categoria)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-neutral-500">
                      Nascimento {formatDataBr(candidato.data_nascimento)} ·{" "}
                      {candidato.posicao ?? "posição não informada"} · Início{" "}
                      {formatDataBr(candidato.data_inicio)}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="shrink-0 text-neutral-300 transition-colors group-hover:text-grena"
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Já avaliados
          </h2>
          {decididos.length === 0 ? (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
              Nenhum candidato avaliado ainda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {decididos.map((candidato) => (
                <div key={candidato.id} className="card flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500">
                    {candidato.numero}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate font-medium text-neutral-800">
                        {candidato.nome_completo}
                        {candidato.categoria ? (
                          <span className="ml-2 text-sm font-normal text-neutral-500">
                            {categoriaBaseLabel(candidato.categoria)}
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${corCaptacaoStatus(candidato.status)}`}
                      >
                        {captacaoStatusLabel(candidato.status)}
                      </span>
                    </div>
                    {candidato.nota_tecnica !== null ? (
                      <p className="mt-1 text-sm text-neutral-500">
                        Técnica {candidato.nota_tecnica} · Física {candidato.nota_fisica} · Tática{" "}
                        {candidato.nota_tatica} · Comportamental {candidato.nota_comportamental}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Meus atletas</h2>
          {atletas.length === 0 ? (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
              Nenhum atleta cadastrado nas suas categorias ainda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {atletas.map((atleta) => (
                <div
                  key={atleta.id}
                  className={`card flex flex-wrap items-center gap-3 p-4 ${bordaClassificacaoAtleta(atleta.classificacao)}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grena/10 text-sm font-bold text-grena-escuro">
                    {atleta.numero_camisa ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-800">{atleta.nome_completo}</p>
                    <p className="mt-0.5 truncate text-sm text-neutral-500">
                      {categoriaBaseLabel(atleta.categoria)} · {atleta.posicao}
                    </p>
                  </div>
                  <ClassificacaoSelectTreinador
                    atletaId={atleta.id}
                    defaultValue={atleta.classificacao}
                    action={salvarClassificacaoTreinador}
                  />
                  <Link href={`/treinador/atletas/${atleta.id}/dispensa`} className="btn-secondary btn-sm shrink-0">
                    {atleta.dispensa_data ? "Ver relatório de dispensa" : "Gerar relatório de dispensa"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
