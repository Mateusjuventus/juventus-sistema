/**
 * Marca da Proxis Gestão Esportiva — o software, não o clube (ver
 * docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md). Os arquivos ficam em
 * `public/brand/`:
 * - `proxis-logo.png`: marca completa (ícone + "PROXIS GESTÃO ESPORTIVA"), enviada pelo Mateus sem
 *   alteração. Uso: Login, tela de escolha de departamento.
 * - `proxis-mark.png`: só o ícone "PX", recortado e centralizado num canvas quadrado transparente
 *   (mesmo tratamento de `juventus-escudo-mark.png`). Uso compacto: sidebar, cabeçalho da Área do
 *   Treinador, favicon/PWA.
 *
 * Espelha `components/juventus-crest.tsx` — o Juventus continua sendo o clube real por trás dos
 * dados do sistema; isto aqui é só a assinatura do software.
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
