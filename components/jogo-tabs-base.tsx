import Link from "next/link";

/**
 * Espelha `components/jogo-tabs.tsx` para o Futebol de Base — mesmas abas, mas com o prefixo de
 * rota `/base/jogos/[categoria]/[id]` (precisa da categoria pra montar os links de volta) e SEM as
 * abas "Credenciamento" e "Carga de Ingressos" (fora de escopo pro Futebol de Base, ver
 * docs/superpowers/specs/2026-07-20-futebol-de-base-design.md).
 */
export function JogoTabsBase({
  jogoId,
  categoria,
  active,
}: {
  jogoId: string;
  categoria: string;
  active:
    | "dados"
    | "convocacao"
    | "programacao"
    | "rooming-list"
    | "onibus"
    | "checklist"
    | "recibo"
    | "financeiro";
}) {
  const base = `/base/jogos/${categoria}/${jogoId}`;

  const logisticaSubTabs = [
    { key: "rooming-list", label: "Rooming List", href: `${base}/rooming-list` },
    { key: "onibus", label: "Ônibus", href: `${base}/onibus` },
  ] as const;

  const emLogistica = active === "rooming-list" || active === "onibus";

  const tabs = [
    { key: "dados", label: "Dados do jogo", href: base },
    { key: "convocacao", label: "Convocação", href: `${base}/convocacao` },
    { key: "programacao", label: "Programação", href: `${base}/programacao` },
    { key: "logistica", label: "Logística", href: `${base}/rooming-list`, active: emLogistica },
    {
      key: "checklist",
      label: "Checklist",
      href: `${base}/checklist`,
      active: active === "checklist",
    },
    { key: "recibo", label: "Recibo de Pagamento", href: `${base}/recibo`, active: active === "recibo" },
    {
      key: "financeiro",
      label: "Financeiro",
      href: `${base}/financeiro`,
      active: active === "financeiro",
    },
  ] as const;

  return (
    <div>
      <Link href={`/base/jogos/${categoria}`} className="text-sm font-medium text-grena hover:underline">
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
