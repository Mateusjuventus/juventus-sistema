import Link from "next/link";

/** Espelha `components/atleta-tabs.tsx` para o Futebol de Base — mesmas abas, com o prefixo de
 * rota `/base/atletas/[categoria]/[id]`. */
export function AtletaTabsBase({
  categoria,
  atletaId,
  active,
}: {
  categoria: string;
  atletaId: string;
  active: "dados-pessoais" | "documentacao" | "dados-de-jogo";
}) {
  const base = `/base/atletas/${categoria}/${atletaId}`;

  const tabs = [
    { key: "dados-pessoais", label: "Dados Pessoais", href: `${base}/ver` },
    { key: "documentacao", label: "Documentação", href: `${base}/documentacao` },
    { key: "dados-de-jogo", label: "Dados de Jogo", href: `${base}/dados-de-jogo` },
  ] as const;

  return (
    <div>
      <Link href={`/base/atletas/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="tab-bar mb-4 mt-3">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`tab-item border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
              active === tab.key
                ? "border-grena text-grena"
                : "border-transparent text-neutral-500 hover:text-grena"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
