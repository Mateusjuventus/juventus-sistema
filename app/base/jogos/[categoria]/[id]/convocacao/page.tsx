import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  ConvocacaoAtletaBaseRow,
  ConvocacaoBaseRow,
  ConvocacaoComissaoBaseRow,
  ConvocacaoStaffBaseRow,
  JogoBaseRow,
  StaffOperacionalBaseComFuncaoRow,
} from "@/lib/supabase/types";
import { ConvocacaoFormBase } from "./convocacao-form-base";
import { saveConvocacaoBase } from "./actions";

/**
 * Espelha `app/jogos/[id]/convocacao/page.tsx` para o Futebol de Base — com uma diferença
 * importante: aqui os atletas e a comissão técnica candidatos à convocação são filtrados pela
 * MESMA categoria do jogo (`.eq("categoria", jogo.categoria)`), já que faz sentido convocar só
 * quem está naquela categoria de idade — ao contrário do Profissional, onde a lista inteira de
 * atletas/comissão está sempre disponível (ver a spec). Staff Operacional continua sem categoria
 * (lista única, compartilhada entre todas as categorias de base).
 */
export default async function ConvocacaoBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const supabase = createClient();

  const [{ data: jogoData }, { data: atletasData }, { data: comissaoData }, { data: staffData }, { data: convocacaoData }] =
    await Promise.all([
      supabase.from("jogos_base").select("*").eq("id", params.id).single(),
      supabase.from("atletas_base").select("*").eq("categoria", categoria).order("nome_completo", { ascending: true }),
      supabase
        .from("comissao_tecnica_base")
        .select("*")
        .eq("categoria", categoria)
        .order("nome_completo", { ascending: true }),
      supabase
        .from("staff_operacional_base")
        .select("*, funcao:staff_funcoes_catalogo(nome)")
        .order("nome_completo", { ascending: true }),
      supabase.from("convocacoes_base").select("*").eq("jogo_id", params.id).maybeSingle(),
    ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoBaseRow;
  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const comissao = (comissaoData ?? []) as ComissaoTecnicaBaseRow[];
  const staff = (staffData ?? []) as StaffOperacionalBaseComFuncaoRow[];
  const convocacao = convocacaoData as ConvocacaoBaseRow | null;

  const atletaStatusMap: Record<string, "titular" | "reserva"> = {};
  const comissaoSelecionados = new Set<string>();
  const staffSelecionados = new Set<string>();

  if (convocacao) {
    const [{ data: caData }, { data: ccData }, { data: csData }] = await Promise.all([
      supabase.from("convocacao_atletas_base").select("*").eq("convocacao_id", convocacao.id),
      supabase.from("convocacao_comissao_base").select("*").eq("convocacao_id", convocacao.id),
      supabase.from("convocacao_staff_base").select("*").eq("convocacao_id", convocacao.id),
    ]);

    ((caData ?? []) as ConvocacaoAtletaBaseRow[]).forEach((row) => {
      atletaStatusMap[row.atleta_id] = row.status;
    });
    ((ccData ?? []) as ConvocacaoComissaoBaseRow[]).forEach((row) => comissaoSelecionados.add(row.comissao_id));
    ((csData ?? []) as ConvocacaoStaffBaseRow[]).forEach((row) => staffSelecionados.add(row.staff_id));
  }

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} categoria={jogo.categoria} active="convocacao" />

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-neutral-600">
          <span className="font-semibold text-grena-escuro">
            {jogo.mandante ? "Juventus" : jogo.adversario_nome}
          </span>{" "}
          x{" "}
          <span className="font-semibold text-grena-escuro">
            {jogo.mandante ? jogo.adversario_nome : "Juventus"}
          </span>{" "}
          — {jogo.competicao}
          {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""}
          {" · "}
          {jogo.mandante ? "Jogo em casa" : "Jogo fora"}
        </p>
        {convocacao ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/base/jogos/${categoria}/${jogo.id}/presskit`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Gerar Presskit (PDF)
            </a>
            <a
              href={`/base/jogos/${categoria}/${jogo.id}/relacionados/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar Relacionados (PDF)
            </a>
            <a
              href={`/base/jogos/${categoria}/${jogo.id}/relacionados/jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar Relacionados (JPG)
            </a>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">
            Salve a convocação para liberar a geração do presskit e dos pôsteres.
          </span>
        )}
      </div>

      <ConvocacaoFormBase
        action={saveConvocacaoBase}
        jogoId={jogo.id}
        mandante={jogo.mandante}
        atletas={atletas}
        comissao={comissao}
        staff={staff}
        atletaStatusMap={atletaStatusMap}
        comissaoSelecionados={comissaoSelecionados}
        staffSelecionados={staffSelecionados}
        capitaoAtletaId={convocacao?.capitao_atleta_id ?? null}
      />
    </AppShell>
  );
}
