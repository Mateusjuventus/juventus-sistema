import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { TreinadorHeader } from "@/components/treinador/treinador-header";
import { JogoCardBase } from "@/components/jogos/jogo-card-base";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { logout } from "@/app/actions";
import { buscarNotificacoes } from "@/lib/notificacoes/actions";
import Link from "next/link";
import type { JogoBaseRow } from "@/lib/supabase/types";

/**
 * Aba "Jogos" da Área do Treinador — mesmos cartões de `/base/jogos` (ver `JogoCardBase`), filtrados
 * pelas categorias do treinador em vez de um filtro de busca (mesmo raciocínio de "Meus atletas" em
 * `/treinador/atletas`: lista direto tudo que é dele, sem seletor). O rodapé do cartão muda pra
 * "Fazer convocação"/"Ver convocação" — Súmula, Checklist e o resto ficam de fora, fora de escopo
 * do treinador (ver docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md).
 */
export default async function TreinadorJogosPage() {
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

  const [{ data: jogosData }, { data: convocacoesData }] = await Promise.all([
    supabase.from("jogos_base").select("*").in("categoria", categorias).order("data_jogo", { ascending: true }),
    supabase.from("convocacoes_base").select("jogo_id"),
  ]);
  const jogos = (jogosData ?? []) as JogoBaseRow[];
  const jogoIdsComConvocacao = new Set((convocacoesData ?? []).map((c) => c.jogo_id as string));

  const logoUrls = await Promise.all(jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path)));

  return (
    <div className="min-h-screen bg-pagina">
      <TreinadorHeader categorias={categorias} notificacoes={notificacoes} active="jogos" />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        {jogos.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">Nenhum jogo cadastrado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {jogos.map((j, i) => {
              const temConvocacao = jogoIdsComConvocacao.has(j.id);
              return (
                <JogoCardBase
                  key={j.id}
                  jogo={j}
                  logoUrl={logoUrls[i]}
                  href={`/treinador/jogos/${j.id}/convocacao`}
                  footer={
                    <Link
                      href={`/treinador/jogos/${j.id}/convocacao`}
                      className="block border-t border-linha py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                    >
                      {temConvocacao ? "Ver convocação" : "Fazer convocação"}
                    </Link>
                  }
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
