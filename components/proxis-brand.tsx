/**
 * Marca da Proxis Gestão Esportiva — o software, não o clube (ver
 * docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md). Os arquivos ficam em
 * `public/brand/`:
 * - `proxis-logo.png`: marca completa (ícone + "PROXIS GESTÃO ESPORTIVA"), enviada pelo Mateus sem
 *   alteração. Uso: só o Login — é a porta de entrada do software, antes de escolher o Juventus.
 * - `proxis-mark.png`: só o ícone "PX", recortado e centralizado num canvas quadrado transparente
 *   (mesmo tratamento de `juventus-escudo-mark.png`). Uso: favicon/PWA e a assinatura discreta no
 *   canto da tela de escolha de departamento (`app/page.tsx`) e do rodapé dos PDFs.
 *
 * Espelha `components/juventus-crest.tsx` — o Juventus continua sendo a identidade principal do
 * sistema por trás do login (escolha de departamento, sidebar, Treinador, PDFs): isto aqui é só a
 * marca do software, que só assume o centro do palco na própria porta de entrada.
 *
 * As cores da marca da Proxis em si (fundo navy + azul de acento, tiradas da logo) ficam em
 * `lib/theme-proxis.ts` — não aqui, e de propósito fora de `lib/theme.ts` (paleta do CLUBE), pra
 * não misturar as duas identidades.
 */

/** Marca completa da Proxis. Uso: Login, tela de escolha de departamento. */
export function ProxisLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/proxis-logo.png"
      alt="Proxis Gestão Esportiva"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/** Só o ícone "PX", para uso compacto (sidebar, cabeçalho, badges inline). */
export function ProxisMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/proxis-mark.png"
      alt="Proxis"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
