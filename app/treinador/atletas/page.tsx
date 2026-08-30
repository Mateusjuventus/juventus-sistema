import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { TreinadorHeader } from "@/components/treinador/treinador-header";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { logout } from "@/app/actions";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { buscarNotificacoes } from "@/lib/notificacoes/actions";
import { salvarClassificacaoTreinador } from "./actions";
import { TreinadorAtletasView } from "./treinador-atletas-view";
import type { AtletaBaseRow, CaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * Aba "Atletas" da Área do Treinador — candidatos "Em avaliação" (Captação) das categorias do
 * treinador + o elenco já do clube ("Meus atletas"), com classificação G1/G2/G3 e Relatório de
 * Dispensa. Era a tela inteira de `/treinador` antes da Fase 4 (3 abas) do plano de implementação
 * — só mudou de endereço. A grade de cards com retrato (foto ou avatar de iniciais colorido) e as
 * abas por contador ficam em `treinador-atletas-view.tsx`; esta página só busca os dados (e as
 * fotos assinadas, já que o bucket é privado).
 */
export default async function TreinadorAtletasPage() {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  const notificacoes = await buscarNotificacoes();

  if (categorias.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-pagina px-4 py-10">
        <JuventusCrestMark className="h-12 w-12" />
        <p className="mt-4 max-w-sm text-center text-neutral-600">
          Você ainda não tem nenhuma categoria vinculada ao seu acesso. Fale com o responsável do
          Futebol de Base.
        </p>
        <form action={logout} className="mt-4">
          <button type="submit" className="btn-secondary btn-sm">
            Sair
          </button>
        </form>
      </main>
    );
  }

  const { data: pendentesData } = await supabase
    .from("captacao_base")
    .select("*")
    .in("categoria", categorias)
    .eq("status", "avaliacao")
    .order("data_inicio", { ascending: true });
  const pendentes = (pendentesData ?? []) as CaptacaoBaseRow[];

  const { data: decididosData } = await supabase
    .from("captacao_base")
    .select("*")
    .in("categoria", categorias)
    .in("status", ["aprovado", "dispensado", "nao_compareceu"])
    .order("data_termino", { ascending: false });
  const decididos = (decididosData ?? []) as CaptacaoBaseRow[];

  // "Meus atletas" (ver docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-
  // design.md, seção 2) — o elenco já do clube (atletas_base) das categorias do treinador, à parte
  // da fila de candidatos da Captação acima. Dispensados não aparecem aqui, mesmo raciocínio da
  // listagem interna (só quem está ativo no elenco).
  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("*")
    .in("categoria", categorias)
    .neq("status", "dispensado")
    .order("nome_completo", { ascending: true });
  const atletas = (atletasData ?? []) as AtletaBaseRow[];

  const [pendentesFotos, decididosFotos, atletasFotos] = await Promise.all([
    Promise.all(pendentes.map((c) => getSignedPhotoUrl(supabase, c.foto_path))),
    Promise.all(decididos.map((c) => getSignedPhotoUrl(supabase, c.foto_path))),
    Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path))),
  ]);

  const pendentesComFoto = pendentes.map((c, i) => ({ ...c, fotoUrl: pendentesFotos[i] }));
  const decididosComFoto = decididos.map((c, i) => ({ ...c, fotoUrl: decididosFotos[i] }));
  const atletasComFoto = atletas.map((a, i) => ({ ...a, fotoUrl: atletasFotos[i] }));

  return (
    <div className="min-h-screen bg-pagina">
      <TreinadorHeader categorias={categorias} notificacoes={notificacoes} active="atletas" />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        <TreinadorAtletasView
          pendentes={pendentesComFoto}
          decididos={decididosComFoto}
          atletas={atletasComFoto}
          salvarClassificacaoTreinador={salvarClassificacaoTreinador}
        />
      </main>
    </div>
  );
}
