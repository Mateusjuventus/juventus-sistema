import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { TreinadorHeader } from "@/components/treinador/treinador-header";
import { buscarNotificacoes } from "@/lib/notificacoes/actions";
import { ConvocacaoFormBase } from "@/app/base/jogos/[id]/convocacao/convocacao-form-base";
import { saveConvocacaoBase } from "@/lib/jogos-base/convocacao-actions";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  ConvocacaoAtletaBaseRow,
  ConvocacaoBaseRow,
  ConvocacaoComissaoBaseRow,
  JogoBaseRow,
} from "@/lib/supabase/types";

/**
 * Convocação sob `/treinador` — mesma tela e mesma Server Action de `/base/jogos/[id]/convocacao`
 * (ver `lib/jogos-base/convocacao-actions.ts`), só trocando o cabeçalho/navegação pro do treinador e
 * checando a categoria do jogo contra `getCategoriasTreinador()` antes de mostrar qualquer coisa —
 * o middleware não bloqueia `/treinador/*` por módulo/categoria como faz com `/base/*`, então essa
 * checagem de página é quem garante que um treinador não abra a convocação de um jogo de outra
 * categoria (a Server Action re-checa de novo por trás, ver o comentário lá). Sem Presskit aqui —
 * fora de escopo do treinador, só Relacionados (ver docs/superpowers/specs/2026-08-30-area-
 * treinador-programacao-design.md).
 */
export default async function TreinadorConvocacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;
  if (categorias.length === 0 || !categorias.includes(jogo.categoria)) notFound();

  const notificacoes = await buscarNotificacoes();
  const categoria = jogo.categoria;

  const [{ data: atletasData }, { data: comissaoData }, { data: convocacaoData }] = await Promise.all([
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
    <div className="min-h-screen bg-pagina">
      <TreinadorHeader categorias={categorias} notificacoes={notificacoes} active="jogos" />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        <Link href="/treinador/jogos" className="text-sm font-medium text-grena hover:underline">
          ← Voltar para Jogos
        </Link>

        <div className="card mb-4 mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
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
                href={`/treinador/jogos/${jogo.id}/relacionados/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Gerar Relacionados (PDF)
              </a>
              <a
                href={`/treinador/jogos/${jogo.id}/relacionados/jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Gerar Relacionados (JPG)
              </a>
            </div>
          ) : (
            <span className="text-xs text-neutral-400">Salve a convocação para liberar a geração dos pôsteres.</span>
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
      </main>
    </div>
  );
}
