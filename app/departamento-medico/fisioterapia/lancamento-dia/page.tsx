import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getFisioterapiaPodeEditar } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { AtletaCardDados } from "@/components/atletas/atleta-card";
import type { AtletaRow, FisioterapiaAtendimentoRow, FisioterapiaLesaoRow } from "@/lib/supabase/types";
import { LancamentoDiaCliente } from "./lancamento-dia-cliente";

export type LancamentoDiaAtletaItem = AtletaCardDados & {
  /** Lesões oferecidas no select "Ligar a uma lesão" deste atleta — lesões ativas agora, mais
   * (merge, ver docs/superpowers/specs/2026-10-07-relatorio-dia-fisioterapia-design.md) qualquer
   * lesão já encerrada que ainda esteja ligada ao atendimento de hoje, pra não perder esse vínculo
   * silenciosamente ao editar (mesma regra que `AtendimentoItem`, na ficha do atleta, já segue). */
  lesoesOpcoes: { id: string; descricao: string }[];
};

/**
 * "Lançamento do dia" (Profissional) — ver docs/superpowers/specs/2026-10-07-relatorio-dia-
 * fisioterapia-design.md, seção 2. Tela pensada pra escrever vários atletas seguidos num mesmo dia;
 * grava no mesmo lugar de sempre (`fisioterapia_atendimentos`, via as Server Actions já existentes
 * em `../[atletaId]/actions.ts`), então o texto do dia já fica de histórico automaticamente.
 */
export default async function LancamentoDiaPage({ searchParams }: { searchParams: { data?: string } }) {
  const supabase = createClient();
  const dataSelecionada = searchParams.data?.trim() || hojeBrasilia();

  const [{ data: atletasData }, { data: lesoesAtivasData }, { data: atendimentosHojeData }, podeEditar] =
    await Promise.all([
      supabase.from("atletas").select("*").eq("ativo", true).order("nome_completo", { ascending: true }),
      supabase
        .from("fisioterapia_lesoes")
        .select("id, atleta_id, descricao")
        .is("data_fim", null)
        .not("data_inicio", "is", null),
      supabase.from("fisioterapia_atendimentos").select("*").eq("data", dataSelecionada),
      getFisioterapiaPodeEditar(supabase),
    ]);

  const atletas = (atletasData ?? []) as AtletaRow[];
  const lesoesAtivas = (lesoesAtivasData ?? []) as Pick<FisioterapiaLesaoRow, "id" | "atleta_id" | "descricao">[];
  const atendimentosHoje = (atendimentosHojeData ?? []) as FisioterapiaAtendimentoRow[];

  // Lesões já encerradas, mas ainda ligadas a um atendimento de hoje — buscadas à parte porque não
  // entram no filtro de "ativa agora" acima (ver doc-comment de `lesoesOpcoes`).
  const lesaoIdsLigadasHoje = atendimentosHoje.map((a) => a.lesao_id).filter((id): id is string => !!id);
  const lesoesAtivasIds = new Set(lesoesAtivas.map((l) => l.id));
  const idsFaltantes = lesaoIdsLigadasHoje.filter((id) => !lesoesAtivasIds.has(id));
  const { data: lesoesFaltantesData } =
    idsFaltantes.length > 0
      ? await supabase.from("fisioterapia_lesoes").select("id, atleta_id, descricao").in("id", idsFaltantes)
      : { data: [] };
  const lesoesFaltantes = (lesoesFaltantesData ?? []) as Pick<FisioterapiaLesaoRow, "id" | "atleta_id" | "descricao">[];

  const lesoesPorAtleta = new Map<string, { id: string; descricao: string }[]>();
  for (const l of [...lesoesAtivas, ...lesoesFaltantes]) {
    const lista = lesoesPorAtleta.get(l.atleta_id) ?? [];
    lista.push({ id: l.id, descricao: l.descricao });
    lesoesPorAtleta.set(l.atleta_id, lista);
  }

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: LancamentoDiaAtletaItem[] = atletas.map((atleta, i) => ({
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
    lesoesOpcoes: lesoesPorAtleta.get(atleta.id) ?? [],
  }));

  return (
    <AppShell largura="total" breadcrumb="Lançamento do dia">
      <Link href="/departamento-medico/fisioterapia" className="text-sm font-medium text-grena hover:underline">
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
          href={`/departamento-medico/fisioterapia/lancamento-dia/pdf?data=${dataSelecionada}`}
          className="btn-secondary btn-sm"
          target="_blank"
        >
          Gerar PDF — {formatDataBr(dataSelecionada)}
        </a>
      </div>

      <div className="mt-6">
        <LancamentoDiaCliente atletas={itens} atendimentosHoje={atendimentosHoje} data={dataSelecionada} podeEditar={podeEditar} />
      </div>
    </AppShell>
  );
}
