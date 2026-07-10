/**
 * Título padrão das telas de módulo (Atletas, Comissão Técnica, Staff Operacional, Jogos...).
 * Só o nome, grande e centralizado — sem texto descritivo. A única exceção é uma pendência
 * (algo que precisa de atenção, ex.: "3 contratos a vencer"), que aparece abaixo do título só
 * quando existir.
 */
export function PageHeader({ title, pendencia }: { title: string; pendencia?: string | null }) {
  return (
    <div className="mt-2 text-center">
      <h1 className="text-3xl font-bold text-grena-escuro">{title}</h1>
      {pendencia ? (
        <p className="mt-1 text-sm font-medium text-amber-700">{pendencia}</p>
      ) : null}
    </div>
  );
}
