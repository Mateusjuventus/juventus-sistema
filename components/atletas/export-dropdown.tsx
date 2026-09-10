"use client";

import { useEffect, useRef, useState } from "react";

export interface ExportOpcao {
  label: string;
  /** Um dos dois: link direto (navega/baixa na hora) ou `onClick` (ex.: abrir o modal de escolha de
   * colunas antes de exportar — ver `ExportColunasModal`). */
  href?: string;
  onClick?: () => void;
  /** Abre `href` numa aba nova em vez de navegar na aba atual — usado no "Exportar PDF" (o PDF sai
   * com `Content-Disposition: inline`, então sem isso ele substituía a própria tela de Atletas em
   * vez de abrir por cima; pedido do Mateus em 2026-09-10). Não se aplica a links que levam pra
   * outra tela de verdade do sistema (ex.: "Exportar relação" da Base), que continuam navegando
   * normalmente na mesma aba. */
  abrirNovaAba?: boolean;
}

/**
 * Dropdown "Exportar" com as opções de exportação da Base (Excel + Relação em PDF, ver
 * docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-design.md, item 10) — as rotas em si não
 * mudam, só a apresentação vira um menu em vez de dois botões `.btn-secondary` separados. Só existe
 * na Base: o Profissional tem uma única forma de exportar hoje (Excel), então continua um botão
 * simples ali, sem dropdown.
 */
export function ExportDropdown({ opcoes }: { opcoes: ExportOpcao[] }) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="btn-secondary inline-flex items-center gap-1.5"
      >
        Exportar
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>

      {aberto ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white text-left shadow-lg">
          {opcoes.map((opcao) =>
            opcao.onClick ? (
              <button
                key={opcao.label}
                type="button"
                onClick={() => {
                  setAberto(false);
                  opcao.onClick?.();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {opcao.label}
              </button>
            ) : (
              <a
                key={opcao.label}
                href={opcao.href}
                target={opcao.abrirNovaAba ? "_blank" : undefined}
                rel={opcao.abrirNovaAba ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  setAberto(false);
                  // Reforço além do `target="_blank"` acima: o Mateus viu o PDF ainda abrindo por
                  // cima da tela de Atletas mesmo com o `target` certo (2026-09-10). Forçando o
                  // `window.open` num clique simples (sem Ctrl/Cmd/Shift/botão do meio, que continuam
                  // usando o comportamento nativo do navegador — abrir em aba nova por conta própria/
                  // nova janela) garante a aba nova mesmo se algo no navegador ignorasse o atributo.
                  if (opcao.abrirNovaAba && opcao.href && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    window.open(opcao.href, "_blank", "noopener,noreferrer");
                  }
                }}
                className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {opcao.label}
              </a>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
