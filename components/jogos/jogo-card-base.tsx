import Link from "next/link";
import type { ReactNode } from "react";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { JogoBaseRow } from "@/lib/supabase/types";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  if (!horario) return null;
  return horario.slice(0, 5);
}

const DIAS_SEMANA_ABREV = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Selo de data compacto do cartão de jogo — ver o comentário equivalente no Profissional
 * (`app/jogos/page.tsx`). */
function formatSeloData(dataIso: string): { diaSemana: string; dia: string; mes: string } {
  const data = new Date(`${dataIso}T12:00:00`);
  return {
    diaSemana: DIAS_SEMANA_ABREV[data.getDay()],
    dia: String(data.getDate()).padStart(2, "0"),
    mes: MESES_ABREV[data.getMonth()],
  };
}

/**
 * Cartão de um jogo do Futebol de Base (selo de data, escudos + placar, badge de resultado/
 * mandante) — extraído de `app/base/jogos/page.tsx` pra ser reaproveitado, idêntico, em
 * `app/treinador/jogos/page.tsx` (ver docs/superpowers/specs/2026-08-30-area-treinador-
 * programacao-design.md, item 2 do escopo: "cartões de jogo idênticos ao layout de /base/jogos").
 * O corpo do cartão (clicável) e o rodapé de ações variam por quem está olhando — por isso `href` e
 * `footer` são props em vez de fixos aqui: Base linka pra `/base/jogos/[id]` com Súmula/Checklist no
 * rodapé, o treinador linka direto pra convocação com um rodapé de uma ação só.
 */
export function JogoCardBase({
  jogo,
  logoUrl,
  href,
  footer,
}: {
  jogo: JogoBaseRow;
  logoUrl: string | null;
  href: string;
  footer: ReactNode;
}) {
  const horario = formatHorario(jogo.horario);
  const selo = formatSeloData(jogo.data_jogo);
  const adversarioLogo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={jogo.adversario_nome}
      className="h-11 w-11 rounded-full border border-neutral-200 bg-white object-contain p-1"
    />
  ) : (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
      {jogo.adversario_nome.slice(0, 3).toUpperCase()}
    </div>
  );
  const juventusLogo = (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white p-1">
      <JuventusCrestMark className="h-full w-full" />
    </div>
  );
  const [ladoEsquerdo, ladoDireito] = jogo.mandante
    ? [
        { logo: juventusLogo, nome: "Juventus" },
        { logo: adversarioLogo, nome: jogo.adversario_nome },
      ]
    : [
        { logo: adversarioLogo, nome: jogo.adversario_nome },
        { logo: juventusLogo, nome: "Juventus" },
      ];

  const temResultado = jogo.gols_pro !== null && jogo.gols_contra !== null;
  const resultado = temResultado
    ? jogo.gols_pro! > jogo.gols_contra!
      ? { label: "Vitória", classe: "bg-green-100 text-green-800" }
      : jogo.gols_pro! < jogo.gols_contra!
        ? { label: "Derrota", classe: "bg-red-100 text-red-800" }
        : { label: "Empate", classe: "bg-neutral-200 text-neutral-700" }
    : null;
  const placarEsquerda = jogo.mandante ? jogo.gols_pro : jogo.gols_contra;
  const placarDireita = jogo.mandante ? jogo.gols_contra : jogo.gols_pro;

  return (
    <div className="card overflow-hidden">
      <Link href={href} className="flex items-stretch transition-colors hover:bg-neutral-50">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-grena px-1 py-3 text-white sm:w-20">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{selo.diaSemana}</span>
          <span className="text-2xl font-black leading-none">{selo.dia}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{selo.mes}</span>
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-medium text-neutral-500">
            <span className="truncate">
              {categoriaBaseLabel(jogo.categoria)} · {jogo.competicao}
              {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""}
            </span>
            <div className="flex shrink-0 gap-1.5">
              {resultado ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultado.classe}`}>
                  {resultado.label}
                </span>
              ) : null}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  jogo.mandante ? "bg-dourado/20 text-grena-escuro" : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {jogo.mandante ? "Em casa" : "Fora"}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
            <div className="flex min-w-0 flex-col items-center gap-1">
              {ladoEsquerdo.logo}
              <span className="max-w-[90px] truncate text-center text-xs font-semibold text-grena-escuro sm:max-w-[140px] sm:text-sm">
                {ladoEsquerdo.nome}
              </span>
            </div>
            {temResultado ? (
              <span className="shrink-0 text-lg font-bold text-grena-escuro">
                {placarEsquerda} × {placarDireita}
              </span>
            ) : (
              <span className="shrink-0 text-lg font-bold text-neutral-300">×</span>
            )}
            <div className="flex min-w-0 flex-col items-center gap-1">
              {ladoDireito.logo}
              <span className="max-w-[90px] truncate text-center text-xs font-semibold text-grena-escuro sm:max-w-[140px] sm:text-sm">
                {ladoDireito.nome}
              </span>
            </div>
          </div>

          <div className="mt-2 text-center text-xs text-neutral-500 sm:text-sm">
            {formatData(jogo.data_jogo)}
            {horario ? ` · ${horario}` : ""}
            {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
          </div>
        </div>
      </Link>

      {footer}
    </div>
  );
}
