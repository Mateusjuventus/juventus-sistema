"use client";

import type { ReactNode } from "react";

const CLOSE_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

/**
 * Modal compartilhado da Programação Semanal — mesmo espírito visual do resto do sistema (`.card`,
 * cantos arredondados, cabeçalho grena-escuro), mas é o primeiro lugar do sistema que precisa de um
 * modal de verdade (ver mockup aprovado) — não existia um componente pronto pra reaproveitar.
 * `maxWidthClassName` deixa o modal de Nova Subatividade mais largo e o de Exportação praticamente
 * de tela cheia (ver spec, "fazer que ele fique na folha inteira").
 */
export function ModalShell({
  titulo,
  subtitulo,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
}: {
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <div className={`flex max-h-[90vh] w-full ${maxWidthClassName} flex-col rounded-lg bg-white shadow-xl`}>
        <div className="flex shrink-0 items-start justify-between border-b border-linha px-6 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-grena-escuro">{titulo}</h3>
            {subtitulo ? <p className="mt-0.5 text-sm text-neutral-500">{subtitulo}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-neutral-400 transition-colors hover:text-neutral-600"
          >
            {CLOSE_SVG}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-linha px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
