import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { podeVerAreaFinanceira } from "@/lib/auth/role";
import { AreaFinanceiraHeader } from "@/components/area-financeira/area-financeira-header";
import { categoriaBaseLabel, TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { GastoJogoRow, JogoRow } from "@/lib/supabase/types";

/**
 * Início da Área Financeira — ver docs/superpowers/specs/2026-10-22-area-financeira-design.md.
 *
 * Redesenhada a pedido do Mateus: o usuário financeiro não precisa do placar/resultado nem do
 * cartão grande com escudos (isso é o card de jogo normal do sistema, pensado pra quem acompanha o
 * jogo em si) — o que ele precisa é ver os GASTOS: o total geral de cada departamento e o total de
 * cada jogo (Previsto e Efetuado), numa lista simples e direto ao ponto. Clicar num jogo continua
 * levando pro Financeiro daquele jogo (Orçamento Previsto / Relatório de Despesas, só leitura).
 */

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

interface TotaisGasto {
  previsto: number;
  efetuado: number;
}

function somarPorJogo(
  gastos: Array<Pick<GastoJogoRow, "jogo_id" | "valor_previsto" | "valor_efetuado">>,
): Map<string, TotaisGasto> {
  const porJogo = new Map<string, TotaisGasto>();
  for (const g of gastos) {
    const atual = porJogo.get(g.jogo_id) ?? { previsto: 0, efetuado: 0 };
    atual.previsto += g.valor_previsto;
    atual.efetuado += g.valor_efetuado ?? 0;
    porJogo.set(g.jogo_id, atual);
  }
  return porJogo;
}

function somarTotalGeral(jogoIds: string[], porJogo: Map<string, TotaisGasto>): TotaisGasto {
  const total: TotaisGasto = { previsto: 0, efetuado: 0 };
  for (const id of jogoIds) {
    const t = porJogo.get(id);
    if (!t) continue;
    total.previsto += t.previsto;
    total.efetuado += t.efetuado;
  }
  return total;
}

function CardTotalGeral({ titulo, totais }: { titulo: string; totais: TotaisGasto }) {
  return (
    <div className="card flex-1 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h3>
      <div className="mt-2 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-neutral-400">Previsto</p>
          <p className="text-xl font-bold text-grena-escuro">{formatMoeda(totais.previsto)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Efetuado</p>
          <p className="text-xl font-bold text-grena-escuro">{formatMoeda(totais.efetuado)}</p>
        </div>
      </div>
    </div>
  );
}

function LinhaJogo({
  href,
  titulo,
  subtitulo,
  totais,
}: {
  href: string;
  titulo: string;
  subtitulo: string;
  totais: TotaisGasto;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-wrap items-center justify-between gap-3 p-3 transition-colors hover:border-grena"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-grena-escuro">{titulo}</p>
        <p className="truncate text-xs text-neutral-500">{subtitulo}</p>
      </div>
      <div className="flex gap-6 text-sm">
        <div className="text-right">
          <p className="text-xs text-neutral-400">Previsto</p>
          <p className="font-semibold text-neutral-800">{formatMoeda(totais.previsto)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Efetuado</p>
          <p className="font-semibold text-neutral-800">{formatMoeda(totais.efetuado)}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function AreaFinanceiraPage() {
  const supabase = createClient();
  const autorizado = await podeVerAreaFinanceira(supabase);

  if (!autorizado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pagina px-4 py-10 text-center">
        <p className="max-w-sm text-neutral-600">Você não tem acesso a esta área.</p>
      </div>
    );
  }

  // Unificação de Jogos/Convocação (30/10/2026, ver 0157_unificacao_jogos.sql): `jogos` e
  // `gastos_jogo` agora guardam os dois departamentos juntos (`jogos.categoria` distingue) — uma
  // query só de cada, filtrando por categoria em vez de duas tabelas separadas.
  const [{ data: jogosData }, { data: jogosBaseData }, { data: gastosData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("categoria", "profissional").order("data_jogo", { ascending: false }),
    supabase.from("jogos").select("*").in("categoria", TODAS_CATEGORIAS_BASE).order("data_jogo", { ascending: false }),
    supabase.from("gastos_jogo").select("jogo_id, valor_previsto, valor_efetuado"),
  ]);

  const jogos = (jogosData ?? []) as JogoRow[];
  const jogosBase = (jogosBaseData ?? []) as JogoRow[];
  const totaisPorJogo = somarPorJogo(gastosData ?? []);
  const totalGeralProfissional = somarTotalGeral(
    jogos.map((j) => j.id),
    totaisPorJogo,
  );
  const totalGeralBase = somarTotalGeral(
    jogosBase.map((j) => j.id),
    totaisPorJogo,
  );

  return (
    <div className="min-h-screen bg-pagina">
      <AreaFinanceiraHeader />

      <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <CardTotalGeral titulo="Total Futebol Profissional" totais={totalGeralProfissional} />
          <CardTotalGeral titulo="Total Futebol de Base" totais={totalGeralBase} />
        </div>

        <h2 className="mb-3 text-lg font-bold text-grena-escuro">Futebol Profissional — por jogo</h2>
        {jogos.length === 0 ? (
          <div className="card mb-8 p-8 text-center text-neutral-400">Nenhum jogo cadastrado ainda.</div>
        ) : (
          <div className="mb-8 space-y-2">
            {jogos.map((j) => (
              <LinhaJogo
                key={j.id}
                href={`/area-financeira/jogos/${j.id}`}
                titulo={`${j.mandante ? "Juventus" : j.adversario_nome} x ${j.mandante ? j.adversario_nome : "Juventus"}`}
                subtitulo={`${j.competicao} · ${formatData(j.data_jogo)}`}
                totais={totaisPorJogo.get(j.id) ?? { previsto: 0, efetuado: 0 }}
              />
            ))}
          </div>
        )}

        <h2 className="mb-3 text-lg font-bold text-grena-escuro">Futebol de Base — por jogo</h2>
        {jogosBase.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">Nenhum jogo cadastrado ainda.</div>
        ) : (
          <div className="space-y-2">
            {jogosBase.map((j) => (
              <LinhaJogo
                key={j.id}
                href={`/area-financeira/base/jogos/${j.id}`}
                titulo={`${j.mandante ? "Juventus" : j.adversario_nome} x ${j.mandante ? j.adversario_nome : "Juventus"}`}
                subtitulo={`${categoriaBaseLabel(j.categoria)} · ${j.competicao} · ${formatData(j.data_jogo)}`}
                totais={totaisPorJogo.get(j.id) ?? { previsto: 0, efetuado: 0 }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
