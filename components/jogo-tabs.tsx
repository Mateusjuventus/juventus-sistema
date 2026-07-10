import Link from "next/link";

/**
 * Navegação por abas dentro de um jogo. Antes, Logística de Jogo e Operação de Jogo eram
 * telas/módulos separados — agora tudo fica unificado aqui como abas do próprio jogo, já que na
 * prática tudo depende da convocação daquele jogo específico.
 *
 * "Rooming List" e "Ônibus" ficam agrupados sob a aba "Logística" (com sub-abas), separada da
 * aba "Credenciamento" — mantém as mesmas rotas de antes, só reorganiza a navegação visualmente.
 */
export function JogoTabs({
  jogoId,
  active,
}: {
  jogoId: string;
  active: "dados" | "convocacao" | "rooming-list" | "onibus" | "credenciamento" | "recibo";
}) {
  const logisticaSubTabs = [
    { key: "rooming-list", label: "Rooming List", href: `/jogos/${jogoId}/rooming-list` },
    { key: "onibus", label: "Ônibus", href: `/jogos/${jogoId}/onibus` },
  ] as const;

  const emLogistica = active === "rooming-list" || active === "onibus";

  const tabs = [
    { key: "dados", label: "Dados do jogo", href: `/jogos/${jogoId}` },
    { key: "convocacao", label: "Convocação", href: `/jogos/${jogoId}/convocacao` },
    { key: "logistica", label: "Logística", href: `/jogos/${jogoId}/rooming-list`, active: emLogistica },
    {
      key: "credenciamento",
      label: "Credenciamento",
      href: `/jogos/${jogoId}/credenciamento`,
      active: active === "credenciamento",
    },
    { key: "recibo", label: "Recibo de Pagamento", href: `/jogos/${jogoId}/recibo`, active: active === "recibo" },
  ] as const;

  return (
    <div>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Jogos
      </Link>
      <div className="mb-4 mt-3 flex flex-wrap gap-1 border-b border-neutral-200">
        {tabs.map((tab) => {
          const isActive = "active" in tab ? tab.active : active === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-grena text-grena"
                  : "border-transparent text-neutral-500 hover:text-grena"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {emLogistica ? (
        <div className="-mt-3 mb-4 flex flex-wrap gap-1">
          {logisticaSubTabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active === tab.key
                  ? "bg-grena text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
