import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { CategoriaBase, ComissaoTecnicaBaseRow } from "@/lib/supabase/types";

/** Tela inicial do módulo Comissão Técnica (Futebol de Base) — mesmo padrão de
 * `app/base/atletas/page.tsx`: um cartão por categoria, com a contagem de pessoas cadastradas. */
export default async function ComissaoTecnicaBasePage() {
  const supabase = createClient();

  const { data } = await supabase.from("comissao_tecnica_base").select("categoria");
  const todos = (data ?? []) as Pick<ComissaoTecnicaBaseRow, "categoria">[];

  const contagemPorCategoria = todos.reduce(
    (acc, pessoa) => {
      acc[pessoa.categoria] = (acc[pessoa.categoria] ?? 0) + 1;
      return acc;
    },
    {} as Record<CategoriaBase, number>,
  );

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Comissão Técnica / Diretoria" />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIAS_BASE.map((cat) => {
          const total = contagemPorCategoria[cat.value] ?? 0;
          return (
            <Link
              key={cat.value}
              href={`/base/comissao-tecnica/${cat.value}`}
              className="card group relative flex flex-col gap-2 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
              <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
                →
              </span>
              <h2 className="text-lg font-bold text-grena-escuro">{cat.label}</h2>
              <p className="text-sm font-medium text-neutral-500">
                {total} pessoa{total === 1 ? "" : "s"} cadastrada{total === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
