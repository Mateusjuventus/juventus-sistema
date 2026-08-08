import Link from "next/link";
import { JuventusCrestMark } from "@/components/juventus-crest";
import type { JogoRow } from "@/lib/supabase/types";

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  return horario ? horario.slice(0, 5) : null;
}

/**
 * Widget "Próximo jogo" — mesmo conteúdo que o cartão "Jogos / Competições" já mostrava antes do
 * redesign (ver a spec), só em formato de widget da grade nova. Sem mudança de dados: continua
 * vindo do primeiro jogo com `data_jogo >= hoje`.
 */
export function ProximoJogoWidget({
  jogo,
  adversarioLogoUrl,
}: {
  jogo: JogoRow | null;
  adversarioLogoUrl: string | null;
}) {
  const juventusLogoCard = (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-linha bg-white p-1">
      <JuventusCrestMark className="h-full w-full" />
    </div>
  );
  const adversarioLogoCard = jogo ? (
    adversarioLogoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={adversarioLogoUrl}
        alt={jogo.adversario_nome}
        className="h-11 w-11 rounded-full border border-linha bg-white object-contain p-1"
      />
    ) : (
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-linha bg-neutral-50 text-[10px] text-neutral-400">
        {jogo.adversario_nome.slice(0, 3).toUpperCase()}
      </div>
    )
  ) : null;
  const [logoEsquerda, logoDireita] = jogo?.mandante
    ? [juventusLogoCard, adversarioLogoCard]
    : [adversarioLogoCard, juventusLogoCard];

  return (
    <Link
      href="/jogos"
      className="card group flex flex-col gap-2 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <h2 className="text-base font-bold text-grena-escuro">Próximo jogo</h2>
      {jogo ? (
        <>
          <div className="flex items-center gap-3">
            {logoEsquerda}
            <span className="text-sm font-bold text-neutral-300">×</span>
            {logoDireita}
          </div>
          <p className="-mt-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{jogo.competicao}</p>
          <p className="-mt-1 text-sm font-medium text-neutral-500">
            {formatData(jogo.data_jogo)}
            {formatHorario(jogo.horario) ? ` · ${formatHorario(jogo.horario)}` : ""}
          </p>
          {jogo.local_estadio ? <p className="-mt-1 text-xs text-neutral-400">{jogo.local_estadio}</p> : null}
        </>
      ) : (
        <p className="text-sm font-medium text-neutral-500">Nenhum jogo agendado</p>
      )}
    </Link>
  );
}
