import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoRow } from "@/lib/supabase/types";

const EM_BREVE: string[] = [];

/** Conta linhas de uma tabela sem trazer os dados (head: true), pra montar a descrição de cada cartão. */
async function contarLinhas(
  supabase: ReturnType<typeof createClient>,
  tabela: string,
): Promise<number> {
  const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true });
  return count ?? 0;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  if (!horario) return null;
  return horario.slice(0, 5);
}

export default async function ProfissionalPage() {
  const supabase = createClient();
  const hojeStr = new Date().toISOString().slice(0, 10);

  const [totalAtletas, totalComissao, { count: totalStaffCount }, { data: proximoJogoData }, { data: gastosData }] =
    await Promise.all([
      contarLinhas(supabase, "atletas"),
      contarLinhas(supabase, "comissao_tecnica"),
      supabase.from("staff_operacional").select("*", { count: "exact", head: true }).eq("ativo", true),
      supabase
        .from("jogos")
        .select("*")
        .gte("data_jogo", hojeStr)
        .order("data_jogo", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("gastos_jogo").select("valor_previsto"),
    ]);
  const totalStaff = totalStaffCount ?? 0;

  const totalPrevisto = ((gastosData ?? []) as { valor_previsto: number }[]).reduce(
    (soma, g) => soma + g.valor_previsto,
    0,
  );

  const proximoJogo = proximoJogoData as JogoRow | null;
  const adversarioLogoUrl = proximoJogo
    ? await getSignedPhotoUrl(supabase, proximoJogo.adversario_logo_path)
    : null;

  // Mesma regra usada no PDF/lista de jogos: em casa, escudo do Juventus primeiro (esquerda);
  // fora, depois do escudo do adversário (direita).
  const juventusLogoCard = (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white p-1">
      <JuventusCrestMark className="h-full w-full" />
    </div>
  );
  const adversarioLogoCard = proximoJogo ? (
    adversarioLogoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={adversarioLogoUrl}
        alt={proximoJogo.adversario_nome}
        className="h-10 w-10 rounded-full border border-neutral-200 bg-white object-contain p-1"
      />
    ) : (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-400">
        {proximoJogo.adversario_nome.slice(0, 3).toUpperCase()}
      </div>
    )
  ) : null;
  const [logoEsquerda, logoDireita] = proximoJogo?.mandante
    ? [juventusLogoCard, adversarioLogoCard]
    : [adversarioLogoCard, juventusLogoCard];

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
    {
      href: "/financeiro",
      titulo: "Prestação de Contas",
      descricao: totalPrevisto > 0 ? `${formatMoeda(totalPrevisto)} previsto` : "Nenhum gasto lançado ainda",
    },
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
            className="card group flex flex-col items-center justify-center gap-2 p-8 text-center transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
          >
            <span className="inline-block h-1 w-10 rounded bg-dourado" />
            <h2 className="text-xl font-bold text-grena-escuro">{item.titulo}</h2>
            <p className="text-sm font-medium text-neutral-500">{item.descricao}</p>
          </Link>
        ))}

        {/* Cartão de Jogos / Competições — mais completo que os outros: mostra os escudos do
            próximo jogo (respeitando a regra de mandante), competição, data/horário e local. */}
        <Link
          href="/jogos"
          className="card group flex flex-col items-center justify-center gap-2 p-8 text-center transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
        >
          <span className="inline-block h-1 w-10 rounded bg-dourado" />
          <h2 className="text-xl font-bold text-grena-escuro">Jogos / Competições</h2>
          {proximoJogo ? (
            <>
              <div className="mt-1 flex items-center gap-3">
                {logoEsquerda}
                <span className="text-sm font-bold text-neutral-300">×</span>
                {logoDireita}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                {proximoJogo.competicao}
              </p>
              <p className="text-sm font-medium text-neutral-500">
                {formatData(proximoJogo.data_jogo)}
                {formatHorario(proximoJogo.horario) ? ` · ${formatHorario(proximoJogo.horario)}` : ""}
              </p>
              {proximoJogo.local_estadio ? (
                <p className="text-xs text-neutral-400">{proximoJogo.local_estadio}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-medium text-neutral-500">Nenhum jogo agendado</p>
          )}
        </Link>
      </div>

      {EM_BREVE.length > 0 ? (
        <>
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
        </>
      ) : null}
    </AppShell>
  );
}
