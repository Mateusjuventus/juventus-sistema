import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const CADASTROS = [
  {
    href: "/atletas",
    titulo: "Atletas",
    descricao: "Elenco profissional: dados pessoais, posição, número, contrato.",
  },
  {
    href: "/comissao-tecnica",
    titulo: "Comissão Técnica / Diretoria",
    descricao: "Técnico, preparadores, departamento médico e diretoria do clube.",
  },
  {
    href: "/staff-operacional",
    titulo: "Staff Operacional",
    descricao: "Segurança, gandulas, maqueiros e demais equipes de jogo.",
  },
  {
    href: "/jogos",
    titulo: "Jogos / Competições",
    descricao: "Calendário de jogos, adversários, local e mandante/visitante.",
  },
];

const EM_BREVE = [
  { titulo: "Convocação + Presskit", descricao: "Geração de imagem/PDF profissional para divulgação." },
  { titulo: "Logística de Jogo", descricao: "Cotações de hotel/ônibus/refeição e PDFs para fornecedores." },
  { titulo: "Operação de Jogo", descricao: "Checklist, staff por jogo e geração de recibos." },
  { titulo: "Prestação de Contas", descricao: "Dashboard e gráficos comparativos entre jogos." },
];

export default function HomePage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Bem-vindo</h1>
      <p className="mt-1 text-neutral-600">Escolha um cadastro para consultar, incluir ou editar.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CADASTROS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card flex flex-col gap-2 p-5 transition-shadow hover:shadow-md"
          >
            <span className="inline-block h-1 w-10 rounded bg-dourado" />
            <h2 className="font-semibold text-grena-escuro">{item.titulo}</h2>
            <p className="text-sm text-neutral-600">{item.descricao}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-500">Em breve</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EM_BREVE.map((item) => (
          <div
            key={item.titulo}
            className="card flex flex-col gap-2 p-5 opacity-60"
            aria-disabled
          >
            <span className="inline-block h-1 w-10 rounded bg-prata" />
            <h3 className="font-semibold text-neutral-600">{item.titulo}</h3>
            <p className="text-sm text-neutral-500">{item.descricao}</p>
            <span className="mt-1 w-fit rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
              Em breve
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
