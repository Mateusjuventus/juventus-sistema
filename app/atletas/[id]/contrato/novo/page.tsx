import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContratoForm } from "@/components/contrato-form";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ATLETA_TIPO_CONTRATO_OPTIONS, ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { criarContrato } from "../actions";

/**
 * Formulário dedicado de "Novo contrato" — único pro Futebol Profissional e pro Futebol de Base
 * desde a unificação de 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-
 * design.md). A lista de opções de tipo de contrato continua diferente por categoria (Iniciação
 * só aparece pra Base, mesma distinção de sempre — ver `ATLETA_TIPO_CONTRATO_OPTIONS`/
 * `ATLETA_BASE_TIPO_CONTRATO_OPTIONS`), por isso a página busca a categoria do atleta primeiro.
 * Alcançado tanto pela tela "Ver atleta" quanto por "Editar atleta" (desde 2026-10-16 o Contrato
 * não é mais uma aba própria — ver `components/contrato-secao.tsx`), então `origem` (na query
 * string do link que trouxe até aqui) diz pra qual das duas a action deve redirecionar de volta
 * depois de salvar.
 */
export default async function NovoContratoAtletaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { origem?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.from("atletas").select("categoria").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const isBase = ehCategoriaBaseValida((data as { categoria: string }).categoria);

  const origem = searchParams.origem === "editar" ? "editar" : "ver";
  const voltarHref = origem === "editar" ? `/atletas/${params.id}` : `/atletas/${params.id}/ver`;

  return (
    <AppShell breadcrumb="Novo contrato">
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo contrato</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ao salvar, o contrato vigente atual (se existir) é encerrado automaticamente e vira histórico.
      </p>
      <div className="mt-4">
        <ContratoForm
          action={criarContrato}
          tipoContratoOptions={isBase ? ATLETA_BASE_TIPO_CONTRATO_OPTIONS : ATLETA_TIPO_CONTRATO_OPTIONS}
          camposExtras={{ atletaId: params.id, origem }}
        />
      </div>
    </AppShell>
  );
}
