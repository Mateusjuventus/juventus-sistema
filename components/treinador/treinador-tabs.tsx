import Link from "next/link";

/**
 * As 3 abas fixas da Área do Treinador (ver mockup aprovado — pills brancos sobre o grena, dentro
 * do próprio cabeçalho, não uma barra branca separada como em `jogo-tabs-base.tsx`). "Jogos" ainda
 * não tem página própria (chega no próximo pacote, Fase 5/6 do plano de implementação) — o link já
 * existe porque as 3 abas fazem parte do mesmo cabeçalho compartilhado.
 */
export function TreinadorTabs({ active }: { active: "inicio" | "jogos" | "atletas" }) {
  const tabs = [
    { key: "inicio", label: "Início", href: "/treinador" },
    { key: "jogos", label: "Jogos", href: "/treinador/jogos" },
    { key: "atletas", label: "Atletas", href: "/treinador/atletas" },
  ] as const;

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            active === tab.key ? "bg-white text-grena" : "text-white/75 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
