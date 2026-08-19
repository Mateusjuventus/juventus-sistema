import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CadastroPublicoToggle } from "@/components/cadastro-publico-toggle";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow, CategoriaBase, ConfiguracaoCadastroAtletaBaseRow } from "@/lib/supabase/types";
import { alternarFichaCadastroAtletaBase } from "./actions";

/**
 * Tela inicial do módulo Atletas (Futebol de Base): um cartão por categoria (Sub20 a Sub11), cada
 * um mostrando quantos atletas estão cadastrados ali. Clicar num cartão leva pra lista daquela
 * categoria (`/base/atletas/[categoria]`) — mesma tabela/ações de sempre (cadastrar, editar,
 * excluir, exportar), só filtrada pela categoria do cartão (ver a spec). O toggle da Ficha de
 * Cadastro pública mora aqui desde o ajuste de 19/08 (antes ficava na tela de Captação, o que
 * misturava as duas coisas — ver docs/superpowers/specs/2026-08-19-captacao-atletas-separacao-design.md).
 */
export default async function AtletasBasePage() {
  const supabase = createClient();

  const [{ data }, { data: configData }] = await Promise.all([
    supabase.from("atletas_base").select("categoria"),
    supabase.from("configuracoes_cadastro_atleta_base").select("*").limit(1).maybeSingle(),
  ]);
  const todos = (data ?? []) as Pick<AtletaBaseRow, "categoria">[];
  const config = configData as ConfiguracaoCadastroAtletaBaseRow | null;

  const contagemPorCategoria = todos.reduce(
    (acc, atleta) => {
      acc[atleta.categoria] = (acc[atleta.categoria] ?? 0) + 1;
      return acc;
    },
    {} as Record<CategoriaBase, number>,
  );

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Atletas" />

      <div className="mt-3 flex justify-center">
        <Link href="/base/atletas/campograma" className="btn-secondary">
          Ver campograma por categoria
        </Link>
      </div>

      {config ? (
        <div className="mt-4">
          <CadastroPublicoToggle
            id={config.id}
            ativo={config.cadastro_publico_ativo}
            linkPath="/cadastro-atleta-base"
            action={alternarFichaCadastroAtletaBase}
          />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIAS_BASE.map((cat) => {
          const total = contagemPorCategoria[cat.value] ?? 0;
          return (
            <Link
              key={cat.value}
              href={`/base/atletas/${cat.value}`}
              className="card group relative flex flex-col gap-2 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
              <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
                →
              </span>
              <h2 className="text-lg font-bold text-grena-escuro">{cat.label}</h2>
              <p className="text-sm font-medium text-neutral-500">
                {total} atleta{total === 1 ? "" : "s"} cadastrado{total === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
