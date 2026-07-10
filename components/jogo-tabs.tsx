import Link from "next/link";

export function JogoTabs({
  jogoId,
  active,
}: {
  jogoId: string;
  active: "dados" | "convocacao";
}) {
  const tabs = [
    { key: "dados", label: "Dados do jogo", href: `/jogos/${jogoId}` },
    { key: "convocacao", label: "Convocação", href: `/jogos/${jogoId}/convocacao` },
  ] as const;

  return (
    <div>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Jogos
      </Link>
      <div className="mb-4 mt-3 flex gap-1 border-b border-neutral-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
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
