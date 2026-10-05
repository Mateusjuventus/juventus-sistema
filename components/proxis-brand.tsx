/**
 * Marca da Proxis Gestão Esportiva — o software, não o clube (ver
 * docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md). Os arquivos ficam em
 * `public/brand/`:
 * - `proxis-logo.png`: marca completa (ícone + "PROXIS GESTÃO ESPORTIVA"), enviada pelo Mateus sem
 *   alteração — texto em navy escuro, pensada pra fundo claro. Hoje sem uso direto no sistema (ver
 *   `ProxisLockupClaro` abaixo, que recompõe o mesmo lockup com texto de verdade em branco).
 * - `proxis-mark.png`: só o ícone "PX", recortado e centralizado num canvas quadrado transparente
 *   (mesmo tratamento de `juventus-escudo-mark.png`). Uso: favicon/PWA e a assinatura discreta no
 *   canto da tela de escolha de departamento (`app/page.tsx`) e do rodapé dos PDFs — sempre sobre
 *   fundo claro.
 * - `proxis-mark-white.png`: o mesmo ícone com o traço navy recolorido pra branco (script Python,
 *   por amostragem de pixel — o azul `#0058EB` da marca foi preservado, só o navy escuro virou
 *   branco). Gerado porque o navy do traço original é quase idêntico ao fundo do Login
 *   (`proxisNavy`) e por isso ficava ilegível ali — ver `ProxisMarkClaro` abaixo.
 *
 * Espelha `components/juventus-crest.tsx` — o Juventus continua sendo a identidade principal do
 * sistema por trás do login (escolha de departamento, sidebar, Treinador, PDFs): isto aqui é só a
 * marca do software, que só assume o centro do palco na própria porta de entrada.
 *
 * As cores da marca da Proxis em si (fundo navy + azul de acento, tiradas da logo) ficam em
 * `lib/theme-proxis.ts` — não aqui, e de propósito fora de `lib/theme.ts` (paleta do CLUBE), pra
 * não misturar as duas identidades.
 */

/** Marca completa da Proxis (texto navy, pra fundo claro). Sem uso direto hoje — ver o comentário
 * acima sobre `ProxisLockupClaro`. */
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

/** Só o ícone "PX" (traço navy + acento azul), pra uso sobre fundo CLARO — sidebar, cabeçalho,
 * badges inline, canto da tela de departamentos, rodapé dos PDFs. */
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

/** Mesmo ícone "PX", com o traço em branco (acento azul preservado) — pra uso sobre fundo ESCURO.
 * Único uso hoje: Login (`app/login/page.tsx`). */
export function ProxisMarkClaro({ className }: { className?: string }) {
  return (
    <img
      src="/brand/proxis-mark-white.png"
      alt="Proxis"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/**
 * Lockup completo da Proxis em texto de verdade (não a imagem `proxis-logo.png`, cujo texto é navy
 * escuro) — ícone + "PROXIS" + "Gestão Esportiva", em branco/cinza-claro pro fundo escuro do Login.
 * Dá controle total de cor (CSS, não pixel de imagem) e deixa o nome nítido em qualquer tom de
 * fundo escuro, ao contrário da imagem original.
 */
export function ProxisLockupClaro({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <ProxisMarkClaro className="h-14 w-auto shrink-0 sm:h-16" />
      <div className="text-left">
        <p className="text-3xl font-black leading-none tracking-tight text-white sm:text-4xl">PROXIS</p>
        <p className="mt-1 text-[11px] font-semibold uppercase leading-none tracking-[0.25em] text-white/55">
          Gestão Esportiva
        </p>
      </div>
    </div>
  );
}
