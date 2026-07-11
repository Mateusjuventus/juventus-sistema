import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import type { JogoRow } from "@/lib/supabase/types";

const EM_BREVE = ["Prestação de Contas"];

/** Conta linhas de uma tabela sem trazer os dados (head: true), pra montar a descrição de cada cartão. */
async function contarLinhas(
  supabase: ReturnType<typeof createClient>,
  tabela: string,
): Promise<number> {
  const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true });
  return count ?? 0;
}

function formatDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default async function ProfissionalPage() {
  const supabase = createClient();
  const hojeStr = new Date().toISOString().slice(0, 10);

  const [totalAtletas, totalComissao, totalStaff, { data: proximoJogoData }] = await Promise.all([
    contarLinhas(supabase, "atletas"),
    contarLinhas(supabase, "comissao_tecnica"),
    contarLinhas(supabase, "staff_operacional"),
    supabase
      .from("jogos")
      .select("*")
      .gte("data_jogo", hojeStr)
      .order("data_jogo", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const proximoJogo = proximoJogoData as JogoRow | null;
  const descricaoJogos = proximoJogo
    ? `Próximo: x ${proximoJogo.adversario_nome} — ${formatDataCurta(proximoJogo.data_jogo)}`
    : "Nenhum jogo agendado";

  const CADASTROS = [
    { href: "/atletas", titulo: "Atletas", descricao: `${totalAtletas} ativo${totalAtletas === 1 ? "" : "s"}` },
    {
      href: "/comissao-tecnica",
      titulo: "Comissão Técnica / Diretoria",
      descricao: `${totalComissao} ativo${totalComissao === 1 ? "" : "s"}`,
    },
    {
      href: "/staff-operacional",
      titulo: "Staff Operacional",
      descricao: `${totalStaff} ativo${totalStaff === 1 ? "" : "s"}`,
    },
    { href: "/jogos", titulo: "Jogos / Competições", descricao: descricaoJogos },
  ];

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
            className="card group flex flex-col items-center gap-2 p-8 text-center transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
          >
            <span className="inline-block h-1 w-10 rounded bg-dourado" />
            <h2 className="text-xl font-bold text-grena-escuro">{item.titulo}</h2>
            <p className="text-sm font-medium text-neutral-500">{item.descricao}</p>
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
