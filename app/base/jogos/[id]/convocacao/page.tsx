import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  ConvocacaoAtletaBaseRow,
  ConvocacaoBaseRow,
  ConvocacaoComissaoBaseRow,
  JogoBaseRow,
} from "@/lib/supabase/types";
import { ConvocacaoFormBase } from "./convocacao-form-base";
import { saveConvocacaoBase } from "@/lib/jogos-base/convocacao-actions";

/**
 * Espelha `app/jogos/[id]/convocacao/page.tsx` para o Futebol de Base — com uma diferença
 * importante: aqui os atletas e a comissão técnica candidatos à convocação são filtrados pela
 * MESMA categoria do jogo (`.eq("categoria", jogo.categoria)`), já que faz sentido convocar só
 * quem está naquela categoria de idade — ao contrário do Profissional, onde a lista inteira de
 * atletas/comissão está sempre disponível (ver a spec). Staff Operacional não participa da
 * convocação (não precisa ser "convocado" — só entra em Credenciamento e Recibo, direto do
 * cadastro ativo, sem depender desta tela).
 */
export default async function ConvocacaoBasePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;
  const categoria = jogo.categoria;

  const [{ data: atletasData }, { data: comissaoData }, { data: convocacaoData }] =
    await Promise.all([
      supabase.from("atletas_base").select("*").eq("categoria", categoria).order("nome_completo", { ascending: true }),
      supabase
        .from("comissao_tecnica_base")
        .select("*")
        .contains("categorias", [categoria])
        .order("nome_completo", { ascending: true }),
      supabase.from("convocacoes_base").select("*").eq("jogo_id", params.id).maybeSingle(),
    ]);

  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const comissao = (comissaoData ?? []) as ComissaoTecnicaBaseRow[];
  const convocacao = convocacaoData as ConvocacaoBaseRow | null;

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));
  const atletasComFoto = atletas.map((a, i) => ({ ...a, fotoUrl: fotoUrls[i] }));

  const atletaStatusMap: Record<string, "titular" | "reserva"> = {};
  // Número da camisa NESSA convocação (não o do cadastro do atleta — na Base ele muda de jogo pra
  // jogo, ver comentário em ConvocacaoAtletaBaseRow). Vem em branco (sem entrada no map) até
  // alguém preencher na tela.
  const atletaNumeroCamisaMap: Record<string, number | null> = {};
  const comissaoSelecionados = new Set<string>();

  if (convocacao) {
    const [{ data: caData }, { data: ccData }] = await Promise.all([
      supabase.from("convocacao_atletas_base").select("*").eq("convocacao_id", convocacao.id),
      supabase.from("convocacao_comissao_base").select("*").eq("convocacao_id", convocacao.id),
    ]);

    ((caData ?? []) as ConvocacaoAtletaBaseRow[]).forEach((row) => {
      atletaStatusMap[row.atleta_id] = row.status;
      atletaNumeroCamisaMap[row.atleta_id] = row.numero_camisa;
    });
    ((ccData ?? []) as ConvocacaoComissaoBaseRow[]).forEach((row) => comissaoSelecionados.add(row.comissao_id));
  }

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="convocacao" />

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
              href={`/base/jogos/${jogo.id}/presskit`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Gerar Presskit (PDF)
            </a>
            <a
              href={`/base/jogos/${jogo.id}/relacionados/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar Relacionados (PDF)
            </a>
            <a
              href={`/base/jogos/${jogo.id}/relacionados/jpg`}
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
        atletas={atletasComFoto}
        comissao={comissao}
        atletaStatusMap={atletaStatusMap}
        atletaNumeroCamisaMap={atletaNumeroCamisaMap}
        comissaoSelecionados={comissaoSelecionados}
        capitaoAtletaId={convocacao?.capitao_atleta_id ?? null}
      />
    </AppShell>
  );
}
