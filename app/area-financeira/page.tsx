import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { podeVerAreaFinanceira } from "@/lib/auth/role";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { AreaFinanceiraHeader } from "@/components/area-financeira/area-financeira-header";
import { JogoCard } from "@/components/jogos/jogo-card";
import { JogoCardBase } from "@/components/jogos/jogo-card-base";
import type { JogoRow, JogoBaseRow } from "@/lib/supabase/types";

/**
 * Início da Área Financeira — lista os jogos do Futebol Profissional e do Futebol de Base, cada um
 * linkando pra versão só-leitura do Financeiro daquele jogo (ver docs/superpowers/specs/
 * 2026-10-22-area-financeira-design.md). Mesmo padrão da Área do Treinador: papel isolado, sem
 * relação com o resto do sistema. Quem não é "financeiro" (nem "master") só vê o aviso abaixo,
 * mesmo que chegue direto nessa URL — o bloqueio de verdade é o middleware, isto aqui é a segunda
 * camada (mesmo raciocínio de `getCategoriasTreinador`).
 */
export default async function AreaFinanceiraPage() {
  const supabase = createClient();
  const autorizado = await podeVerAreaFinanceira(supabase);

  if (!autorizado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pagina px-4 py-10 text-center">
        <p className="max-w-sm text-neutral-600">Você não tem acesso a esta área.</p>
      </div>
    );
  }

  const [{ data: jogosData }, { data: jogosBaseData }] = await Promise.all([
    supabase.from("jogos").select("*").order("data_jogo", { ascending: false }),
    supabase.from("jogos_base").select("*").order("data_jogo", { ascending: false }),
  ]);
  const jogos = (jogosData ?? []) as JogoRow[];
  const jogosBase = (jogosBaseData ?? []) as JogoBaseRow[];

  const [logoUrls, logoUrlsBase] = await Promise.all([
    Promise.all(jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path))),
    Promise.all(jogosBase.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path))),
  ]);

  return (
    <div className="min-h-screen bg-pagina">
      <AreaFinanceiraHeader />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        <h2 className="mb-3 text-lg font-bold text-grena-escuro">Futebol Profissional</h2>
        {jogos.length === 0 ? (
          <div className="card mb-8 p-8 text-center text-neutral-400">Nenhum jogo cadastrado ainda.</div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {jogos.map((j, i) => (
              <JogoCard
                key={j.id}
                jogo={j}
                logoUrl={logoUrls[i]}
                href={`/area-financeira/jogos/${j.id}`}
                footer={
                  <Link
                    href={`/area-financeira/jogos/${j.id}`}
                    className="block border-t border-linha py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                  >
                    Ver despesas
                  </Link>
                }
              />
            ))}
          </div>
        )}

        <h2 className="mb-3 text-lg font-bold text-grena-escuro">Futebol de Base</h2>
        {jogosBase.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">Nenhum jogo cadastrado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {jogosBase.map((j, i) => (
              <JogoCardBase
                key={j.id}
                jogo={j}
                logoUrl={logoUrlsBase[i]}
                href={`/area-financeira/base/jogos/${j.id}`}
                footer={
                  <Link
                    href={`/area-financeira/base/jogos/${j.id}`}
                    className="block border-t border-linha py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                  >
                    Ver despesas
                  </Link>
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
