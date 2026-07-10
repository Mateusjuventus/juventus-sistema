import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrestMark } from "@/components/juventus-crest";

const CADASTROS = [
  { href: "/atletas", titulo: "Atletas" },
  { href: "/comissao-tecnica", titulo: "Comissão Técnica / Diretoria" },
  { href: "/staff-operacional", titulo: "Staff Operacional" },
  { href: "/jogos", titulo: "Jogos / Competições" },
];

const EM_BREVE = ["Logística de Jogo", "Operação de Jogo", "Prestação de Contas"];

export default function ProfissionalPage() {
  return (
    <AppShell>
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Início
      </Link>
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <JuventusCrestMark className="h-12 w-12" />
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol Profissional</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CADASTROS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card group flex flex-col items-center gap-3 p-8 text-center transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
          >
            <span className="inline-block h-1 w-10 rounded bg-dourado" />
            <h2 className="text-xl font-bold text-grena-escuro">{item.titulo}</h2>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-center text-lg font-semibold text-neutral-500">Em breve</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EM_BREVE.map((titulo) => (
          <div
            key={titulo}
            className="card flex flex-col items-center gap-3 p-8 text-center opacity-60"
            aria-disabled
          >
            <span className="inline-block h-1 w-10 rounded bg-prata" />
            <h3 className="text-xl font-bold text-neutral-600">{titulo}</h3>
            <span className="w-fit rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600">
              Em breve
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
