import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  ConvocacaoAtletaRow,
  ConvocacaoComissaoRow,
  ConvocacaoRow,
  JogoRow,
} from "@/lib/supabase/types";
import { ConvocacaoForm } from "./convocacao-form";
import { saveConvocacao } from "./actions";

export default async function ConvocacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: atletasData }, { data: comissaoData }, { data: convocacaoData }] =
    await Promise.all([
      supabase.from("jogos").select("*").eq("id", params.id).single(),
      supabase.from("atletas").select("*").order("nome_completo", { ascending: true }),
      supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true }),
      supabase.from("convocacoes").select("*").eq("jogo_id", params.id).maybeSingle(),
    ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoRow;
  const atletas = (atletasData ?? []) as AtletaRow[];
  const comissao = (comissaoData ?? []) as ComissaoTecnicaRow[];
  const convocacao = convocacaoData as ConvocacaoRow | null;

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));
  const atletasComFoto = atletas.map((a, i) => ({ ...a, fotoUrl: fotoUrls[i] }));

  const atletaStatusMap: Record<string, "titular" | "reserva"> = {};
  const comissaoSelecionados = new Set<string>();

  if (convocacao) {
    const [{ data: caData }, { data: ccData }] = await Promise.all([
      supabase.from("convocacao_atletas").select("*").eq("convocacao_id", convocacao.id),
      supabase.from("convocacao_comissao").select("*").eq("convocacao_id", convocacao.id),
    ]);

    ((caData ?? []) as ConvocacaoAtletaRow[]).forEach((row) => {
      atletaStatusMap[row.atleta_id] = row.status;
    });
    ((ccData ?? []) as ConvocacaoComissaoRow[]).forEach((row) => comissaoSelecionados.add(row.comissao_id));
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
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/jogos/${jogo.id}/presskit`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Gerar Presskit (PDF)
            </a>
            <a
              href={`/jogos/${jogo.id}/relacionados/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar Relacionados (PDF)
            </a>
            <a
              href={`/jogos/${jogo.id}/relacionados/jpg`}
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

      <ConvocacaoForm
        action={saveConvocacao}
        jogoId={jogo.id}
        atletas={atletasComFoto}
        comissao={comissao}
        atletaStatusMap={atletaStatusMap}
        comissaoSelecionados={comissaoSelecionados}
        capitaoAtletaId={convocacao?.capitao_atleta_id ?? null}
      />
    </AppShell>
  );
}
