/**
 * Ícones simples (stroke, 24x24) de cada módulo do sistema — usados na sidebar (ver
 * `components/app-shell.tsx`). Mesmo traço dos ícones que já existiam soltos dentro de
 * `app/profissional/page.tsx` (cartões da Home); centralizados aqui pra sidebar e qualquer outro
 * lugar poderem reaproveitar sem duplicar SVG. As páginas de Home (`app/profissional/page.tsx`,
 * `app/base/page.tsx`) continuam com suas próprias cópias por enquanto — ver a spec do redesign,
 * o cartão-grade delas sai numa etapa posterior, momento em que também passam a importar daqui.
 */
export function IconAtletas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function IconComissao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  );
}

export function IconStaff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

export function IconJogos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export function IconSolicitacoes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 3h6l4 4v13a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconEstoque({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

export function IconFinanceiro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

export function IconCompeticoes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 21h8M12 17v4M17 4H7v5a5 5 0 0010 0V4Z" />
      <path d="M7 6H4a1 1 0 00-1 1 4 4 0 004 4M17 6h3a1 1 0 011 1 4 4 0 01-4 4" />
    </svg>
  );
}

export function IconTermos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M10 8h4M10 12h4M10 16h2" />
    </svg>
  );
}

export function IconRelatorio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 3h6l4 4v13a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15h6M9 18h3" />
    </svg>
  );
}

export function IconUsuarios({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 4.5c1.6.3 2.8 1.7 2.8 3.4s-1.2 3.1-2.8 3.4" />
      <path d="M18.5 14.7c2 .6 3 2.2 3 5.3" />
    </svg>
  );
}

export function IconHotel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V5a1 1 0 011-1h12a1 1 0 011 1v16" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2" />
      <path d="M10 21v-4h4v4" />
    </svg>
  );
}

export function IconVeiculo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M4 16.5v2a1 1 0 001 1h1.5a1 1 0 001-1v-1M16.5 17.5v1a1 1 0 001 1H19a1 1 0 001-1v-2" />
      <path d="M3.5 16.5v-3.2c0-.4.1-.8.3-1.1l2-3.5A2 2 0 017.5 7.5h9a2 2 0 011.7 1l2 3.5c.2.3.3.7.3 1.1v3.4a1 1 0 01-1 1h-15a1 1 0 01-1-1Z" />
      <path d="M6.5 13.5h2M15.5 13.5h2" />
    </svg>
  );
}

/** Captação/Avaliação — lupa sobre uma pessoa (escoutar/avaliar candidatos). */
export function IconCaptacao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 19c0-3 2.5-4.5 5.5-4.5" />
      <circle cx="16.5" cy="16.5" r="3.2" />
      <path d="M19 19l2.5 2.5" />
    </svg>
  );
}

/** Alojamento — cama simples. */
export function IconAlojamento({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 19v-8a1 1 0 011-1h16a1 1 0 011 1v8" />
      <path d="M3 19v-3h18v3M3 16v-2.5a1 1 0 011-1h6.5V16M13.5 12.5H20a1 1 0 011 1V16" />
      <circle cx="7" cy="10" r="1.3" />
    </svg>
  );
}
