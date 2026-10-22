import Link from "next/link";
import { JuventusCrest } from "@/components/juventus-crest";
import { logout } from "@/app/actions";

/**
 * Cabeçalho da Área Financeira — espelha `components/treinador/treinador-header.tsx`, bem mais
 * enxuto: não tem abas (só existem as duas telas — lista de jogos e o Financeiro de um jogo), nem
 * sino de notificações (esse papel não assina nada, não há pendência pra avisar — ver
 * docs/superpowers/specs/2026-10-22-area-financeira-design.md).
 */
export function AreaFinanceiraHeader() {
  return (
    <div className="bg-grena">
      <div className="mx-auto max-w-[1184px] px-4 py-5 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <JuventusCrest className="h-10 w-auto shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Juventus SAF</p>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Área Financeira</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/minha-conta"
              className="rounded-md border border-white/25 px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Minha Conta
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-white/25 px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
