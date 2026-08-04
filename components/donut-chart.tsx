export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Gráfico de rosca simples em SVG puro (sem biblioteca de gráfico) — usado no gráfico de
 * participação das Estatísticas do Atleta (Titular/Banco/Não Convocado), mas genérico o bastante
 * pra qualquer conjunto pequeno de fatias com contagem. Mostra a legenda com o valor de cada fatia
 * ao lado, e uma mensagem quando o total é zero (sem ficar com um anel vazio sem explicação).
 */
export function DonutChart({
  slices,
  size = 160,
  strokeWidth = 26,
  unidadeLabel = "jogo",
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  /** Singular da unidade contada em cada fatia (plural adiciona "s") — ex.: "jogo" vira "jogos". */
  unidadeLabel?: string;
}) {
  const total = slices.reduce((soma, fatia) => soma + fatia.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetAcumulado = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E5E5"
          strokeWidth={strokeWidth}
        />
        {total > 0
          ? slices.map((fatia) => {
              if (fatia.value === 0) return null;
              const dash = (fatia.value / total) * circumference;
              const dashoffset = -offsetAcumulado;
              offsetAcumulado += dash;
              return (
                <circle
                  key={fatia.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={fatia.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashoffset}
                />
              );
            })
          : null}
      </svg>
      <div className="space-y-1.5">
        {slices.map((fatia) => (
          <div key={fatia.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: fatia.color }}
            />
            <span className="text-neutral-700">
              {fatia.label} — {fatia.value} {unidadeLabel}
              {fatia.value === 1 ? "" : "s"}
            </span>
          </div>
        ))}
        {total === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum jogo no período selecionado.</p>
        ) : null}
      </div>
    </div>
  );
}
