import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CampogramaPitch } from "@/components/campograma-pitch";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_BASE, categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { agruparPorPosicao, type AtletaCampograma } from "@/lib/futebol/campograma";
import { categoriaDaPosicao } from "@/lib/futebol/categoria-posicao";
import type { AtletaBaseRow } from "@/lib/supabase/types";

/**
 * Campograma: o elenco de uma categoria, separado por posição num campo (ver
 * docs/superpowers/specs/2026-08-19-captacao-base-design.md). Uma categoria por vez — abas simples
 * por link, sem JS no cliente.
 */
export default async function CampogramaPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoria = ehCategoriaBaseValida(searchParams.categoria ?? "") ? searchParams.categoria! : "sub20";

  const supabase = createClient();
  const { data } = await supabase
    .from("atletas_base")
    .select("id, nome_completo, apelido, numero_camisa, posicao")
    .eq("categoria", categoria)
    // Atleta dispensado não faz sentido continuar aparecendo posicionado no campo (ver
    // docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 4).
    .neq("status", "dispensado")
    .order("nome_completo", { ascending: true });

  const atletas = (data ?? []) as Pick<
    AtletaBaseRow,
    "id" | "nome_completo" | "apelido" | "numero_camisa" | "posicao"
  >[];

  const paraCampograma: AtletaCampograma[] = atletas.map((a) => ({
    id: a.id,
    nome: a.nome_completo,
    apelido: a.apelido,
    numeroCamisa: a.numero_camisa,
    categoriaPosicao: categoriaDaPosicao(a.posicao),
  }));

  const grupos = agruparPorPosicao(paraCampograma);

  return (
    <AppShell departamento="futebol_base">
      <Link href={`/base/atletas/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Atletas
      </Link>
      <PageHeader title={`Campograma — ${categoriaBaseLabel(categoria)}`} />

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {CATEGORIAS_BASE.map((cat) => (
          <Link
            key={cat.value}
            href={`/base/atletas/campograma?categoria=${cat.value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              cat.value === categoria
                ? "bg-grena text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <CampogramaPitch grupos={grupos} />
      </div>
    </AppShell>
  );
}
