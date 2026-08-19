import { projetarEstados } from "@/lib/futebol/mapa-brasil";

/**
 * Mapa esquemático do Brasil por estado (bolha por UF, ver `lib/futebol/mapa-brasil.ts` pro porquê
 * de não ser um mapa com fronteiras de verdade). Tamanho e cor da bolha crescem com a quantidade —
 * dá pra ver "de onde vem a maior parte da captação" sem precisar ler número nenhum, e o número
 * ainda aparece dentro de cada bolha que tiver candidato.
 */
export function MapaBrasilUf({
  contagem,
  largura = 340,
  altura = 380,
}: {
  /** UF → quantidade. Estado ausente do objeto conta como 0. */
  contagem: Record<string, number>;
  largura?: number;
  altura?: number;
}) {
  const pontos = projetarEstados(largura, altura);
  const maxContagem = Math.max(0, ...Object.values(contagem));

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" style={{ maxWidth: largura }} role="img" aria-label="Mapa do Brasil por estado, com a quantidade de candidatos da Captação em cada um">
        {pontos.map((p) => {
          const total = contagem[p.uf] ?? 0;
          const raio = maxContagem > 0 ? 5 + 15 * (total / maxContagem) : 5;
          const opacidade = total === 0 ? 0 : Math.max(0.4, total / maxContagem);
          return (
            <g key={p.uf}>
              <circle
                cx={p.x}
                cy={p.y}
                r={raio}
                fill={total === 0 ? "#E3E5E8" : "#5C0A35"}
                fillOpacity={total === 0 ? 1 : opacidade}
                stroke={total > 0 ? "#3F0724" : "#C9CDD3"}
                strokeWidth={0.75}
              />
              {total > 0 ? (
                <text
                  x={p.x}
                  y={p.y + raio + 9}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  fill="#3F0724"
                >
                  {total}
                </text>
              ) : null}
              <text x={p.x} y={p.y - raio - 3} textAnchor="middle" fontSize={7} fill="#737373">
                {p.uf}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-xs text-neutral-400">
        Tamanho e cor da bolha = quantidade de candidatos da Captação vindos daquele estado. Cinza =
        nenhum candidato ainda.
      </p>
    </div>
  );
}
