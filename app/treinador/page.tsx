import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { logout } from "@/app/actions";
import { captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Tela do Treinador (ver docs/superpowers/specs/2026-08-19-parecer-final-treinador-design.md) —
 * fora do `AppShell` comum de propósito: sem menu de departamento/módulo, sem link pro resto do
 * sistema. Só um cabeçalho simples com as categorias dele e um botão de sair. Lista os candidatos
 * "Em avaliação" de TODAS as categorias dele (podem ser mais de uma, ex. Sub-11 e Sub-12 ao mesmo
 * tempo) — é só isso que ele precisa agir. Abaixo, uma lista só-leitura dos já decididos por ele,
 * pra conferir o que já preencheu sem poder editar depois de salvo.
 */
export default async function TreinadorPage() {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);

  if (categorias.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-center text-neutral-600">
          Você ainda não tem nenhuma categoria vinculada ao seu acesso. Fale com o responsável do
          Futebol de Base.
        </p>
        <form action={logout} className="mt-4 flex justify-center">
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-grena-escuro">Avaliação de candidatos</h1>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {categorias.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-grena/10 px-2.5 py-0.5 text-xs font-semibold text-grena-escuro"
              >
                {categoriaBaseLabel(cat)}
              </span>
            ))}
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="btn-secondary btn-sm">
            Sair
          </button>
        </form>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Aguardando avaliação
          <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
            {pendentes.length}
          </span>
        </h2>
        {pendentes.length === 0 ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            Nenhum candidato aguardando avaliação no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {pendentes.map((candidato) => (
              <Link
                key={candidato.id}
                href={`/treinador/${candidato.id}`}
                className="card block p-4 hover:border-grena"
              >
                <p className="font-medium text-neutral-800">
                  {candidato.nome_completo}
                  {candidato.categoria ? (
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      {categoriaBaseLabel(candidato.categoria)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-neutral-500">
                  Nascimento {formatDataBr(candidato.data_nascimento)} ·{" "}
                  {candidato.posicao ?? "posição não informada"} · Início{" "}
                  {formatDataBr(candidato.data_inicio)}
                </p>
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
          <div className="space-y-3">
            {decididos.map((candidato) => (
              <div key={candidato.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-neutral-800">
                    {candidato.nome_completo}
                    {candidato.categoria ? (
                      <span className="ml-2 text-sm font-normal text-neutral-500">
                        {categoriaBaseLabel(candidato.categoria)}
                      </span>
                    ) : null}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${corCaptacaoStatus(candidato.status)}`}
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
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
