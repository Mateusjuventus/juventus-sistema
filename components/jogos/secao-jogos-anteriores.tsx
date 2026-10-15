import type { ReactNode } from "react";

/**
 * Seção recolhível "Jogos anteriores" usada nas listagens de Jogos (Profissional e Base) — pedido
 * do Mateus pra tirar o excesso de cartões da tela, deixando só os próximos jogos em destaque por
 * padrão. Usa `<details>`/`<summary>` nativos (sem JS/estado) — abre/fecha no clique, começa
 * fechado.
 */
export function SecaoJogosAnteriores({ count, children }: { count: number; children: ReactNode }) {
  return (
    <details className="group mt-6">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 text-sm font-semibold uppercase tracking-wide text-grena-escuro [&::-webkit-details-marker]:hidden">
        <span className="inline-block transition-transform group-open:rotate-90">▶</span>
        Jogos anteriores ({count})
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </details>
  );
}
