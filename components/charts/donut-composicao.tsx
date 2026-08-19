"use client";

import { useState } from "react";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface FatiaComposicao {
  label: string;
  valor: number;
  cor: string;
}

/**
 * Donut interativo da composição do gasto (Comissão Técnica / Atletas / Despesas avulsas) — usado
 * na aba "Geral da Base" de `/base/financeiro`. Passar o mouse numa fatia (ou na legenda) destaca a
 * fatia e troca o texto central pro valor daquela fatia; sem hover, mostra o total. O mesmo
 * conjunto de fatias é reaproveitado no PDF (`lib/pdf/relatorio-geral-base-document.tsx`), com o
 * desenho refeito lá em cima de `<Path>` porque o react-pdf não suporta hover nem
 * `stroke-dashoffset` (só `stroke-dasharray`) — ver comentário lá.
 */
export function DonutComposicao({ fatias, total }: { fatias: FatiaComposicao[]; total: number }) {
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);

  const raio = 58;
  const espessura = 22;
  const circunferencia = 2 * Math.PI * raio;
  const ativo = indiceAtivo !== null ? fatias[indiceAtivo] : null;

  let acumulado = 0;
  const segmentos = fatias.map((fatia, i) => {
    const fracao = total > 0 ? fatia.valor / total : 0;
    const comprimento = fracao * circunferencia;
    const offset = -acumulado;
    acumulado += comprimento;
    return { ...fatia, comprimento, offset, indice: i };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: 152, height: 152 }}>
        <svg
          width="152"
          height="152"
          viewBox="0 0 152 152"
          className="-rotate-90"
          role="img"
          aria-label="Composição do gasto por tipo"
        >
          <circle cx="76" cy="76" r={raio} fill="none" stroke="#EEF0F2" strokeWidth={espessura} />
          {segmentos
            .filter((s) => s.comprimento > 0)
            .map((s) => (
              <circle
                key={s.label}
                cx="76"
                cy="76"
                r={raio}
                fill="none"
                stroke={s.cor}
                strokeWidth={indiceAtivo === s.indice ? espessura + 6 : espessura}
                strokeDasharray={`${s.comprimento} ${circunferencia - s.comprimento}`}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
                style={{
                  transition: "stroke-width 0.15s ease, opacity 0.15s ease",
                  opacity: indiceAtivo === null || indiceAtivo === s.indice ? 1 : 0.4,
                  cursor: "pointer",
                }}
                onMouseEnter={() => setIndiceAtivo(s.indice)}
                onMouseLeave={() => setIndiceAtivo(null)}
              />
            ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            {ativo ? ativo.label : "Total geral"}
          </p>
          <p className="mt-0.5 text-base font-bold leading-tight text-grena-escuro">
            {formatMoeda(ativo ? ativo.valor : total)}
          </p>
        </div>
      </div>

      <ul className="flex w-full max-w-xs flex-col gap-1">
        {fatias.map((fatia, i) => {
          const pct = total > 0 ? Math.round((fatia.valor / total) * 100) : 0;
          return (
            <li
              key={fatia.label}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                indiceAtivo === i ? "bg-pagina" : ""
              }`}
              onMouseEnter={() => setIndiceAtivo(i)}
              onMouseLeave={() => setIndiceAtivo(null)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: fatia.cor }} />
              <span className="min-w-0 flex-1 truncate font-medium text-neutral-700">{fatia.label}</span>
              <span className="shrink-0 text-xs text-neutral-400">{pct}%</span>
              <span className="shrink-0 font-semibold text-neutral-800">{formatMoeda(fatia.valor)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
