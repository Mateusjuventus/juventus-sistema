import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ehCategoriaBaseValida, type CategoriaBase } from "@/lib/auth/categorias-base";
import { RelacaoAtletasForm } from "./relacao-atletas-form";

/**
 * Relação de Atletas da Base, sempre organizada por categoria (ver docs/superpowers/specs/
 * 2026-09-04-relacao-atletas-base-design.md) — diferente do Relatório Avulso, que junta Atletas +
 * Comissão Técnica + Staff numa lista só sem separar por categoria. Sem busca no Supabase aqui: a
 * tela só precisa da lista estática de categorias (o formulário decide categoria/status/colunas na
 * hora de gerar, e é o próprio POST pra `/base/atletas/relacao/pdf` que busca os atletas).
 * `?categoria=` (vindo do botão "Exportar relação" de `/base/atletas/[categoria]`) pré-seleciona
 * aquela categoria; ausente (vindo do botão da tela principal de Atletas) começa em "Todas as
 * categorias".
 */
export default function RelacaoAtletasBasePage({ searchParams }: { searchParams: { categoria?: string } }) {
  const categoriaInicial: CategoriaBase | "todas" =
    searchParams.categoria && ehCategoriaBaseValida(searchParams.categoria) ? searchParams.categoria : "todas";

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/atletas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Exportar relação de atletas" />
      <p className="mt-1 text-sm text-neutral-500">
        Gera um PDF com os atletas separados por categoria — escolha o escopo, os status e os dados
        que devem aparecer.
      </p>

      <div className="mt-4">
        <RelacaoAtletasForm categoriaInicial={categoriaInicial} />
      </div>
    </AppShell>
  );
}
