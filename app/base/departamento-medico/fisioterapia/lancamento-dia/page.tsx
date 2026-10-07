import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getFisioterapiaPodeEditarBase, getCategoriasBasePermitidas } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { AtletaCardDados } from "@/components/atletas/atleta-card";
import type { AtletaBaseRow, CategoriaBase, FisioterapiaAtendimentoBaseRow, FisioterapiaLesaoBaseRow } from "@/lib/supabase/types";
import { LancamentoDiaClienteBase } from "./lancamento-dia-cliente-base";

export type LancamentoDiaAtletaItemBase = AtletaCardDados & {
  categoria: CategoriaBase;
  /** Espelha `LancamentoDiaAtletaItem` (Profissional) — ver docs/superpowers/specs/2026-10-07-
   * relatorio-dia-fisioterapia-design.md. */
  lesoesOpcoes: { id: string; descricao: string }[];
};

/**
 * "Lançamento do dia" (Base) — espelha `../../../../departamento-medico/fisioterapia/lancamento-dia/
 * page.tsx` (Profissional), restrito às categorias que o usuário pode ver (`getCategoriasBasePermitidas`,
 * mesmo critério já usado na listagem principal da Fisioterapia Base).
 */
export default async function LancamentoDiaPageBase({ searchParams }: { searchParams: { data?: string } }) {
  const supabase = createClient();
  const dataSelecionada = searchParams.data?.trim() || hojeBrasilia();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const [{ data: atletasData }, { data: lesoesAtivasData }, { data: atendimentosHojeData }, podeEditar] =
    await Promise.all([
      supabase
        .from("atletas_base")
        .select("*")
        .eq("ativo", true)
        .in("categoria", categoriasPermitidas)
        .order("nome_completo", { ascending: true }),
      supabase
        .from("fisioterapia_lesoes_base")
        .select("id, atleta_id, descricao")
        .is("data_fim", null)
        .not("data_inicio", "is", null),
      supabase.from("fisioterapia_atendimentos_base").select("*").eq("data", dataSelecionada),
      getFisioterapiaPodeEditarBase(supabase),
    ]);

  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const lesoesAtivas = (lesoesAtivasData ?? []) as Pick<FisioterapiaLesaoBaseRow, "id" | "atleta_id" | "descricao">[];
  const atendimentosHojeTodos = (atendimentosHojeData ?? []) as FisioterapiaAtendimentoBaseRow[];
  // Restrito às categorias permitidas (um atendimento de um atleta fora do escopo não deveria
  // aparecer nem na lista "Lançados nessa data") — igual ao filtro já aplicado em `atletas`.
  const idsPermitidos = new Set(atletas.map((a) => a.id));
  const atendimentosHoje = atendimentosHojeTodos.filter((a) => idsPermitidos.has(a.atleta_id));

  const lesaoIdsLigadasHoje = atendimentosHoje.map((a) => a.lesao_id).filter((id): id is string => !!id);
  const lesoesAtivasIds = new Set(lesoesAtivas.map((l) => l.id));
  const idsFaltantes = lesaoIdsLigadasHoje.filter((id) => !lesoesAtivasIds.has(id));
  const { data: lesoesFaltantesData } =
    idsFaltantes.length > 0
      ? await supabase.from("fisioterapia_lesoes_base").select("id, atleta_id, descricao").in("id", idsFaltantes)
      : { data: [] };
  const lesoesFaltantes = (lesoesFaltantesData ?? []) as Pick<FisioterapiaLesaoBaseRow, "id" | "atleta_id" | "descricao">[];

  const lesoesPorAtleta = new Map<string, { id: string; descricao: string }[]>();
  for (const l of [...lesoesAtivas, ...lesoesFaltantes]) {
    const lista = lesoesPorAtleta.get(l.atleta_id) ?? [];
    lista.push({ id: l.id, descricao: l.descricao });
    lesoesPorAtleta.set(l.atleta_id, lista);
  }

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: LancamentoDiaAtletaItemBase[] = atletas.map((atleta, i) => ({
    id: atleta.id,
    nome: atleta.nome_completo,
    apelido: atleta.apelido,
    cpf: null,
    fotoUrl: fotoUrls[i],
    dataNascimento: atleta.data_nascimento,
    dataFimContrato: null,
    tipoContrato: null,
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa,
    dispensado: false,
    ativo: true,
    categoria: atleta.categoria,
    lesoesOpcoes: lesoesPorAtleta.get(atleta.id) ?? [],
  }));

  return (
    <AppShell departamento="futebol_base" largura="total" breadcrumb="Lançamento do dia">
      <Link href="/base/departamento-medico/fisioterapia" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="card mt-4 flex flex-wrap items-end justify-between gap-3 p-4">
        <form method="get" className="flex items-end gap-2">
          <div>
            <label htmlFor="data" className="field-label">
              Data
            </label>
            <input type="date" id="data" name="data" defaultValue={dataSelecionada} className="field-input w-auto" />
          </div>
          <button type="submit" className="btn-secondary btn-sm">
            Ver
          </button>
        </form>
        <a
          href={`/base/departamento-medico/fisioterapia/lancamento-dia/pdf?data=${dataSelecionada}`}
          className="btn-secondary btn-sm"
          target="_blank"
        >
          Gerar PDF — {formatDataBr(dataSelecionada)}
        </a>
      </div>

      <div className="mt-6">
        <LancamentoDiaClienteBase
          atletas={itens}
          atendimentosHoje={atendimentosHoje}
          data={dataSelecionada}
          podeEditar={podeEditar}
          categoriasPermitidas={categoriasPermitidas}
        />
      </div>
    </AppShell>
  );
}
