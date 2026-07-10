/**
 * Brasão oficial do Juventus. Os arquivos ficam em `public/brand/`:
 * - `juventus-escudo.png`: brasão completo, com as duas estrelas (prata e dourada) acima do escudo.
 * - `juventus-escudo-mark.png`: só o escudo circular (recorte sem as estrelas), para uso compacto
 *   em espaços pequenos como o cabeçalho, onde as estrelas ficariam ilegíveis.
 *
 * Estas mesmas imagens (arquivos estáticos, sem depender do Supabase Storage) são as que devem ser
 * usadas na geração dos documentos oficiais (presskit, lista de ônibus, rooming list, credenciamento,
 * recibo), seguindo a regra de posicionamento: jogo em casa, brasão do Juventus primeiro (esquerda);
 * jogo fora, depois do escudo do time mandante (direita).
 */

/** Brasão completo, com as duas estrelas acima do escudo. Uso: Login, cartões de departamento. */
export function JuventusCrest({ className }: { className?: string }) {
  return (
    <img
      src="/brand/juventus-escudo.png"
      alt="Brasão do Juventus"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/** Só o escudo circular, sem as estrelas — para uso compacto (cabeçalho, badges inline). */
export function JuventusCrestMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/juventus-escudo-mark.png"
      alt="Brasão do Juventus"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/** Cores oficiais, para reuso em outros pontos (ex.: geração de PDF). */
export const JUVENTUS_CORES = { grena: "#5C0A35", dourado: "#C9A227", prata: "#B0B0B0" };
