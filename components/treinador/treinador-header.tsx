import { JuventusCrestMark } from "@/components/juventus-crest";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { SinoNotificacoes, type NotificacaoResumo } from "@/components/sino-notificacoes";
import { PushOptIn } from "@/components/push-opt-in";
import { logout } from "@/app/actions";
import { TreinadorTabs } from "./treinador-tabs";

/**
 * Cabeçalho compartilhado das 3 abas da Área do Treinador (ver mockup aprovado) — escudo, badges de
 * categoria, sino de notificações, sair e a navegação em pills. Extraído de `app/treinador/page.tsx`
 * (Fase 4 do plano de implementação: 3 abas em vez de uma tela única) — antes disso só existia essa
 * página, então o cabeçalho vivia direto nela.
 */
export function TreinadorHeader({
  categorias,
  notificacoes,
  active,
}: {
  categorias: string[];
  notificacoes: NotificacaoResumo[];
  active: "inicio" | "jogos" | "atletas";
}) {
  return (
    <div className="bg-grena">
      <div className="mx-auto max-w-[1184px] px-4 py-5 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <JuventusCrestMark className="h-9 w-9 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Juventus SAF · Futebol de Base</p>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Área do Treinador</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SinoNotificacoes notificacoes={notificacoes} caminhoAtual="/treinador" abrirPara="baixo" />
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
          <p className="flex flex-wrap gap-1.5">
            {categorias.map((cat) => (
              <span key={cat} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                {categoriaBaseLabel(cat)}
              </span>
            ))}
          </p>
          <TreinadorTabs active={active} />
        </div>

        <div className="mt-3">
          <PushOptIn />
        </div>
      </div>
    </div>
  );
}
