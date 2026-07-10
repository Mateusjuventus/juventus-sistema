import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  ConvocacaoAtletaRow,
  ConvocacaoComissaoRow,
  ConvocacaoRow,
  ConvocacaoStaffRow,
  JogoRow,
  StaffOperacionalComFuncaoRow,
} from "@/lib/supabase/types";
import { ConvocacaoForm } from "./convocacao-form";
import { saveConvocacao } from "./actions";

export default async function ConvocacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: atletasData }, { data: comissaoData }, { data: staffData }, { data: convocacaoData }] =
    await Promise.all([
      supabase.from("jogos").select("*").eq("id", params.id).single(),
      supabase.from("atletas").select("*").order("nome_completo", { ascending: true }),
      supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true }),
      supabase
        .from("staff_operacional")
        .select("*, funcao:staff_funcoes_catalogo(nome)")
        .order("nome_completo", { ascending: true }),
      supabase.from("convocacoes").select("*").eq("jogo_id", params.id).maybeSingle(),
    ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoRow;
  const atletas = (atletasData ?? []) as AtletaRow[];
  const comissao = (comissaoData ?? []) as ComissaoTecnicaRow[];
  const staff = (staffData ?? []) as StaffOperacionalComFuncaoRow[];
  const convocacao = convocacaoData as ConvocacaoRow | null;

  const atletaStatusMap: Record<string, "titular" | "reserva"> = {};
  const comissaoSelecionados = new Set<string>();
  const staffSelecionados = new Set<string>();

  if (convocacao) {
    const [{ data: caData }, { data: ccData }, { data: csData }] = await Promise.all([
      supabase.from("convocacao_atletas").select("*").eq("convocacao_id", convocacao.id),
      supabase.from("convocacao_comissao").select("*").eq("convocacao_id", convocacao.id),
      supabase.from("convocacao_staff").select("*").eq("convocacao_id", convocacao.id),
    ]);

    ((caData ?? []) as ConvocacaoAtletaRow[]).forEach((row) => {
      atletaStatusMap[row.atleta_id] = row.status;
    });
    ((ccData ?? []) as ConvocacaoComissaoRow[]).forEach((row) => comissaoSelecionados.add(row.comissao_id));
    ((csData ?? []) as ConvocacaoStaffRow[]).forEach((row) => staffSelecionados.add(row.staff_id));
  }

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="convocacao" />

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
          <a
            href={`/jogos/${jogo.id}/presskit`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Gerar Presskit (PDF)
          </a>
        ) : (
          <span className="text-xs text-neutral-400">
            Salve a convocação para liberar a geração do presskit.
          </span>
        )}
      </div>

      <ConvocacaoForm
        action={saveConvocacao}
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
