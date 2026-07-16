import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { totalItem } from "@/lib/estoque/estoque-ajustes";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueItemRow } from "@/lib/supabase/types";

/**
 * Estoque é um módulo só, mas com duas listas totalmente separadas — Esportivo e Médico nunca se
 * misturam (catálogo, entradas, saídas e histórico, cada um com o seu). Esta tela é só a porta de
 * entrada: escolher qual das duas.
 */
export default async function EstoquePage() {
  const supabase = createClient();
  const { data } = await supabase.from("estoque_itens").select("*");
  const itens = (data ?? []) as EstoqueItemRow[];

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Estoque" />
      <p className="-mt-4 text-center text-sm text-neutral-500">
        Escolha o estoque — Esportivo e Médico são controlados separadamente.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ESTOQUE_CATEGORIAS.map((c) => {
          const doGrupo = itens.filter((item) => item.categoria === c.value);
          const totalPecas = doGrupo.reduce((soma, item) => soma + totalItem(item), 0);
          return (
            <Link
              key={c.value}
              href={`/estoque/${c.value}`}
              className="card group relative flex flex-col gap-2 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-grena" />
              <h2 className="text-lg font-bold text-grena-escuro">{c.label}</h2>
              <p className="text-sm font-medium text-neutral-500">
                {doGrupo.length} referência{doGrupo.length === 1 ? "" : "s"} · {totalPecas} peça
                {totalPecas === 1 ? "" : "s"} em estoque
              </p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
