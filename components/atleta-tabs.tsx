import Link from "next/link";

/**
 * Navegação por abas do perfil do atleta (visão somente leitura, `/atletas/[id]/...`) — mesmo
 * espírito do `JogoTabs`: cada aba é uma rota própria, renderizada no servidor. "Dados Pessoais" é
 * a antiga página `/ver` (dados pessoais/esportivos/naturalidade, sem mudança de conteúdo);
 * "Documentação" e "Dados de Jogo" são novas — ver
 * docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md.
 */
export function AtletaTabs({
  atletaId,
  active,
}: {
  atletaId: string;
  active: "dados-pessoais" | "documentacao" | "dados-de-jogo";
}) {
  const tabs = [
    { key: "dados-pessoais", label: "Dados Pessoais", href: `/atletas/${atletaId}/ver` },
    { key: "documentacao", label: "Documentação", href: `/atletas/${atletaId}/documentacao` },
    { key: "dados-de-jogo", label: "Dados de Jogo", href: `/atletas/${atletaId}/dados-de-jogo` },
  ] as const;

  return (
    <div>
      <Link href="/atletas" className="text-sm font-medium text-grena hover:underline">
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
