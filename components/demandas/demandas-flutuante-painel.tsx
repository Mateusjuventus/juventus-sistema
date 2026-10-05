"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DemandaStatusSelect } from "@/components/demanda-status";
import { corPrazoDemanda, type CorPrazoDemanda } from "@/lib/demandas/cor-prazo";
import { updateDemandaStatus } from "@/app/minhas-demandas/actions";
import { NovaDemandaForm, type PessoaParaAtribuir } from "./nova-demanda-form";
import type { DemandaRow } from "@/lib/supabase/types";

const LIMITE_EXIBIDAS = 6;

const COR_DOT: Record<CorPrazoDemanda, string> = {
  verde: "bg-emerald-500",
  laranja: "bg-orange-500",
  vermelho: "bg-red-500",
};

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

/** Bolinha de urgência pelo prazo — verde/laranja/vermelho (ver `corPrazoDemanda`); sem prazo ou
 * concluída não mostra nada (não existe urgência pra marcar). */
function PrazoDot({ cor }: { cor: CorPrazoDemanda | null }) {
  if (!cor) return <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-200" aria-hidden />;
  return <span className={`h-2 w-2 shrink-0 rounded-full ${COR_DOT[cor]}`} aria-hidden title={cor} />;
}

/**
 * Painel flutuante de Demandas — fixo na tela inteira (dentro do `AppShell`, não embutido em
 * nenhuma tela específica), pedido do Mateus em 05/10: "fica num módulo e acaba tendo que passar
 * [por cima dele]... [quero] uma tela que fica sempre fixa e tipo ter uma seta que esconda, mas que
 * apareça depois... tipo como se fosse um botão e ao passar o mouse ele abre uma telinha". Substitui
 * o antigo `MinhasDemandasWidget` embutido em `/profissional`/`/base` — ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 2 (adendo 05/10).
 *
 * Interação: passar o mouse por cima do botão já abre a telinha (`onMouseEnter` no `<div>` que
 * envolve botão + painel juntos — por isso os dois ficam dentro do MESMO elemento hoverable, senão
 * mover o cursor do botão pro painel contaria como "saiu" no meio do caminho); tirar o mouse fecha
 * de novo, com um pequeno atraso (`ATRASO_FECHAR_MS`) só pra não fechar se a pessoa só passou o
 * cursor rápido por cima sem querer. Um CLIQUE "fixa" aberto (`fixado`) — essencial em
 * touch/celular, que não tem hover, e também útil no desktop pra mexer no formulário sem o painel
 * fechar sozinho se o mouse sair da área por um instante; clicar de novo (no X) desfixa e fecha.
 * Começa fechado em toda navegação — mesmo raciocínio de `GrupoRecolhivel` em
 * `components/app-sidebar.tsx`: nada de localStorage pra lembrar entre páginas.
 */
export function DemandasFlutuantePainel({
  demandas,
  hojeStr,
  pessoas,
}: {
  demandas: DemandaRow[];
  hojeStr: string;
  pessoas: PessoaParaAtribuir[];
}) {
  const [aberto, setAberto] = useState(false);
  const [fixado, setFixado] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ATRASO_FECHAR_MS = 200;

  function limparTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function aoEntrar() {
    limparTimeout();
    setAberto(true);
  }

  function aoSair() {
    if (fixado) return;
    limparTimeout();
    timeoutRef.current = setTimeout(() => setAberto(false), ATRASO_FECHAR_MS);
  }

  function aoClicarBotao() {
    // Clicar no botão fechado sempre fixa aberto (cobre touch, sem hover) — clicar com o painel já
    // aberto por hover também fixa, em vez de fechar (o fechar tem botão próprio, o X).
    limparTimeout();
    setAberto(true);
    setFixado(true);
  }

  function fechar() {
    limparTimeout();
    setAberto(false);
    setFixado(false);
  }

  const cores = demandas.map((d) => corPrazoDemanda(d.prazo, d.status, hojeStr));
  const piorCor: CorPrazoDemanda | null = cores.includes("vermelho")
    ? "vermelho"
    : cores.includes("laranja")
      ? "laranja"
      : cores.includes("verde")
        ? "verde"
        : null;
  const exibidas = demandas.slice(0, LIMITE_EXIBIDAS);

  return (
    <div
      className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6"
      onMouseEnter={aoEntrar}
      onMouseLeave={aoSair}
    >
      {aberto ? (
        <div className="card max-h-[75vh] w-[min(92vw,22rem)] overflow-y-auto p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Minhas Demandas</h2>
            <button
              type="button"
              onClick={fechar}
              className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              title="Esconder"
              aria-label="Esconder painel de Demandas"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.5 5 7 10l5.5 5" />
              </svg>
            </button>
          </div>

          {exibidas.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">Nenhuma demanda em aberto. 🎉</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {exibidas.map((d) => {
                const prazoFormatado = formatData(d.prazo);
                const cor = corPrazoDemanda(d.prazo, d.status, hojeStr);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2">
                    <PrazoDot cor={cor} />
                    <div className="min-w-[120px] flex-1">
                      <p className="text-sm text-neutral-800">{d.titulo}</p>
                      {prazoFormatado ? (
                        <p className={`text-xs ${cor === "vermelho" ? "font-semibold text-red-700" : "text-neutral-400"}`}>
                          {cor === "vermelho" ? "Atrasada · " : "Prazo: "}
                          {prazoFormatado}
                        </p>
                      ) : null}
                    </div>
                    <DemandaStatusSelect id={d.id} status={d.status} action={updateDemandaStatus} />
                  </li>
                );
              })}
            </ul>
          )}

          {demandas.length > LIMITE_EXIBIDAS ? (
            <Link href="/minhas-demandas" className="mt-2 block text-xs font-semibold text-grena hover:underline">
              Ver tudo ({demandas.length})
            </Link>
          ) : null}

          <div className="mt-3 border-t border-neutral-100 pt-3">
            <NovaDemandaForm compacta pessoas={pessoas} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={aoClicarBotao}
        className="flex items-center gap-2 rounded-full bg-grena px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
        title="Demandas — passe o mouse ou clique pra abrir"
      >
        <PrazoDot cor={piorCor} />
        Demandas
        {demandas.length > 0 ? (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs tabular-nums">{demandas.length}</span>
        ) : null}
      </button>
    </div>
  );
}
