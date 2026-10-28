import Link from "next/link";

/**
 * Duas abas de dentro do Organograma da Base (ver docs/superpowers/specs/2026-08-23-organograma-
 * base-design.md): "Lista" volta pra tela única de Comissão Técnica/Diretoria (já unificada — ver
 * docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md — `/base/comissao-
 * tecnica` hoje só redireciona pra lá, por isso aponta direto pra `/comissao-tecnica`) e
 * "Organograma" é o único sub-módulo que não migrou (fica só na Base). Mesmo padrão de abas do
 * `JogoTabsBase`.
 */
export function ComissaoTecnicaBaseTabs({ active }: { active: "lista" | "organograma" }) {
  const tabs = [
    { key: "lista", label: "Lista", href: "/comissao-tecnica" },
    { key: "organograma", label: "Organograma", href: "/base/comissao-tecnica/organograma" },
  ] as const;

  return (
    <div className="tab-bar mb-4 mt-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`tab-item border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
            active === tab.key ? "border-grena text-grena" : "border-transparent text-neutral-500 hover:text-grena"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
