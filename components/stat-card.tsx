/** Cartão de estatística simples (rótulo + número em destaque) — mesmo padrão já usado no
 * dashboard de Jogos, promovido a componente compartilhado pra reaproveitar nas Estatísticas do
 * Atleta (Profissional e Base). */
export function StatCard({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string | number;
  destaque?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${destaque ?? "text-grena-escuro"}`}>{valor}</p>
    </div>
  );
}
