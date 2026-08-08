import Link from "next/link";
import type { AtletaContratoVencendo } from "@/lib/futebol/calendario";

const CLASSE_URGENCIA: Record<"urgente" | "atencao", string> = {
  urgente: "bg-red-50 text-red-700",
  atencao: "bg-amber-50 text-amber-700",
};

/**
 * Widget "Contratos vencendo" — atletas com `data_fim_contrato` dentro de 90 dias (ver a spec do
 * redesign visual). Vermelho quando faltam 30 dias ou menos, amarelo até 90 — cálculo em
 * `lib/futebol/calendario.ts` (`atletasContratoVencendo`).
 */
export function ContratosVencendoWidget({ itens }: { itens: AtletaContratoVencendo[] }) {
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="text-base font-bold text-grena-escuro">Contratos vencendo</h2>
      <p className="mt-0.5 text-xs text-neutral-400">Atletas com contrato terminando nos próximos 90 dias</p>

      {itens.length === 0 ? (
        <p className="mt-4 text-center text-sm text-neutral-400">Nenhum contrato vencendo nos próximos 90 dias.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {itens.map(({ atleta, diasRestantes, urgencia }) => (
            <Link
              key={atleta.id}
              href={`/atletas/${atleta.id}`}
              className="flex items-center justify-between gap-2 rounded-md border border-linha p-2.5 transition-colors hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-800">{atleta.nome_completo}</p>
                <p className="text-xs text-neutral-400">{atleta.posicao}</p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${CLASSE_URGENCIA[urgencia]}`}
              >
                {diasRestantes === 0 ? "Vence hoje" : `Faltam ${diasRestantes}d`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
