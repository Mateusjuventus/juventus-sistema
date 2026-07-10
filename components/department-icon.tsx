/**
 * Ícone do cartão "Futebol de Base" na Home. O Futebol Profissional já usa o brasão oficial do
 * Juventus (ver components/juventus-crest.tsx); o Futebol de Base ainda não tem identidade visual
 * própria, então usa este ícone genérico até o módulo ser desenhado.
 */
export function SproutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 21v-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 13c0-3.5-2.5-6-6.5-6C5.5 11 8 13.5 12 13Z" fill="currentColor" opacity="0.16" />
      <path
        d="M12 13c0-3.5-2.5-6-6.5-6C5.5 11 8 13.5 12 13Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 10c0-3 2.2-5.2 5.8-5.2C17.9 8.4 15.6 10.6 12 10Z" fill="currentColor" opacity="0.16" />
      <path
        d="M12 10c0-3 2.2-5.2 5.8-5.2C17.9 8.4 15.6 10.6 12 10Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ícone do botão "Tarefas" no cabeçalho — uma prancheta com itens marcados. */
export function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2" width="6" height="3" rx="1" fill="currentColor" />
      <path d="M8 10.5 9.5 12 12.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 10.5h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 16 9.5 17.5 12.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 16h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
