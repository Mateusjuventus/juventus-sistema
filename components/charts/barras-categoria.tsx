"use client";

import { useState } from "react";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface LinhaBarra {
  key: string;
  label: string;
  valor: number;
}

/**
 * Versão interativa de `BarraCategoria` (antes só CSS estático em `geral-base-view.tsx`) — passar
 * o mouse numa linha destaca a barra em dourado e mostra um balão com o % do total geral da Base,
 * além do valor que já aparecia fixo ao lado. Continua sendo a mesma barra proporcional ao maior
 * valor entre as categorias; só a interação é nova.
 */
export function BarrasCategoria({ linhas }: { linhas: LinhaBarra[] }) {
  const [ativa, setAtiva] = useState<string | null>(null);

  const maximo = Math.max(...linhas.map((l) => l.valor), 0);
  const totalGeral = linhas.reduce((soma, l) => soma + l.valor, 0);

  return (
    <div>
      {linhas.map((linha) => {
        const largura = maximo > 0 ? Math.max((linha.valor / maximo) * 100, linha.valor > 0 ? 2 : 0) : 0;
        const maiorValor = linha.valor === maximo && maximo > 0;
        const destaque = ativa === linha.key || maiorValor;
        const pct = totalGeral > 0 ? ((linha.valor / totalGeral) * 100).toFixed(1) : "0,0";

        return (
          <div
            key={linha.key}
            className="relative flex items-center gap-3 py-1.5"
            onMouseEnter={() => setAtiva(linha.key)}
            onMouseLeave={() => setAtiva(null)}
          >
            {ativa === linha.key ? (
              <div className="absolute -top-7 left-16 z-10 whitespace-nowrap rounded-md bg-grena-escuro px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                {pct}% do total geral
              </div>
            ) : null}
            <span className="w-16 shrink-0 text-sm font-medium text-neutral-600">{linha.label}</span>
            <div className="h-3 flex-1 cursor-pointer overflow-hidden rounded-full bg-pagina">
              <div
                className={`h-full rounded-full transition-all duration-300 ${destaque ? "bg-dourado" : "bg-grena"}`}
                style={{ width: `${largura}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-sm font-semibold text-neutral-800">
              {formatMoeda(linha.valor)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
