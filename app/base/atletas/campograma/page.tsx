import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CampogramaElenco } from "@/components/campograma-elenco";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { CATEGORIAS_BASE, categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { agruparPorPosicaoEspecifica, type AtletaCampograma } from "@/lib/futebol/campograma";
import type { AtletaBaseRow } from "@/lib/supabase/types";

/**
 * Campograma: o elenco de uma categoria, separado por posição (ver docs/superpowers/specs/
 * 2026-08-26-campograma-foto-classificacao-design.md). Uma categoria por vez — abas simples por
 * link, sem JS no cliente pra trocar de categoria (só o arrastar-e-soltar dentro da categoria atual
 * usa interatividade, ver `CampogramaElenco`).
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
    .select("id, nome_completo, apelido, posicao, foto_path, classificacao, tipo_contrato, data_nascimento, status")
    .eq("categoria", categoria)
    // Atleta dispensado não faz sentido continuar aparecendo posicionado no elenco (ver
    // docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 4).
    .neq("status", "dispensado")
    .order("nome_completo", { ascending: true });

  const atletas = (data ?? []) as Pick<
    AtletaBaseRow,
    | "id"
    | "nome_completo"
    | "apelido"
    | "posicao"
    | "foto_path"
    | "classificacao"
    | "tipo_contrato"
    | "data_nascimento"
    | "status"
  >[];

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const paraCampograma: AtletaCampograma[] = atletas.map((a, i) => ({
    id: a.id,
    nome: a.nome_completo,
    apelido: a.apelido,
    posicao: a.posicao,
    fotoUrl: fotoUrls[i],
    classificacao: a.classificacao,
    tipoContrato: a.tipo_contrato,
    dataNascimento: a.data_nascimento,
    status: a.status,
  }));

  const grupos = agruparPorPosicaoEspecifica(paraCampograma);

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

      {atletas.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <a
            href={`/base/atletas/campograma/pdf?categoria=${categoria}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Exportar PDF
          </a>
        </div>
      ) : null}

      <div className="mt-4">
        <CampogramaElenco grupos={grupos} categoria={categoria} />
      </div>
    </AppShell>
  );
}
