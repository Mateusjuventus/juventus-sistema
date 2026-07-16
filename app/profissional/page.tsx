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

/** Ícones simples (stroke, 24x24) usados nos cartões de módulo — um por área, pra dar identidade
 * visual rápida sem depender de uma biblioteca de ícones externa. */
function IconAtletas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

function IconComissao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  );
}

function IconStaff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function IconFinanceiro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconJogos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function IconSolicitacoes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 3h6l4 4v13a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

/** Badge do ícone no topo do cartão — cor própria por módulo, pra facilitar identificar cada área
 * rapidamente na tela inicial. */
function IconBadge({
  icone: Icone,
  corBg,
  corIcone,
}: {
  icone: (props: { className?: string }) => JSX.Element;
  corBg: string;
  corIcone: string;
}) {
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${corBg} ${corIcone}`}>
      <Icone className="h-6 w-6" />
    </div>
  );
}

/** Seta que desliza levemente pra direita ao passar o mouse — indica que o cartão é clicável. */
function SetaCartao() {
  return (
    <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
      →
    </span>
  );
}

type CartaoModulo = {
  href: string;
  titulo: string;
  descricao: string;
  icone: (props: { className?: string }) => JSX.Element;
  corBarra: string;
  corBg: string;
  corIcone: string;
};

/** Cartão padrão de módulo (ícone + título + descrição) — usado tanto pelos itens de CADASTROS
 * quanto pelo cartão de Prestação de Contas, que agora fica isolado no fim da grade. */
function CartaoCadastro({ item }: { item: CartaoModulo }) {
  return (
    <Link
      href={item.href}
      className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${item.corBarra}`} />
      <SetaCartao />
      <IconBadge icone={item.icone} corBg={item.corBg} corIcone={item.corIcone} />
      <h2 className="text-lg font-bold text-grena-escuro">{item.titulo}</h2>
      <p className="text-sm font-medium text-neutral-500">{item.descricao}</p>
    </Link>
  );
}

export default async function ProfissionalPage() {
  const supabase = createClient();
  const hojeStr = new Date().toISOString().slice(0, 10);

  const [
    totalAtletas,
    totalComissao,
    { count: totalStaffCount },
    { data: proximoJogoData },
    { data: gastosData },
    { count: totalSolicitacoesPendentesCount },
  ] = await Promise.all([
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
    supabase.from("solicitacoes").select("*", { count: "exact", head: true }).eq("status", "pendente"),
  ]);
  const totalStaff = totalStaffCount ?? 0;
  const totalSolicitacoesPendentes = totalSolicitacoesPendentesCount ?? 0;

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

  const CADASTROS: CartaoModulo[] = [
    {
      href: "/atletas",
      titulo: "Atletas",
      descricao: `${totalAtletas} ativo${totalAtletas === 1 ? "" : "s"}`,
      icone: IconAtletas,
      corBarra: "bg-grena",
      corBg: "bg-grena/10",
      corIcone: "text-grena",
    },
    {
      href: "/comissao-tecnica",
      titulo: "Comissão Técnica / Diretoria",
      descricao: `${totalComissao} ativo${totalComissao === 1 ? "" : "s"}`,
      icone: IconComissao,
      corBarra: "bg-emerald-600",
      corBg: "bg-emerald-50",
      corIcone: "text-emerald-600",
    },
    {
      href: "/solicitacoes",
      titulo: "Solicitações",
      descricao:
        totalSolicitacoesPendentes > 0
          ? `${totalSolicitacoesPendentes} pendente${totalSolicitacoesPendentes === 1 ? "" : "s"}`
          : "Nenhuma pendente",
      icone: IconSolicitacoes,
      corBarra: "bg-purple-600",
      corBg: "bg-purple-50",
      corIcone: "text-purple-600",
    },
  ];

  // Fica isolado no fim da grade agora — o usuário pediu pra Prestação de Contas ficar embaixo,
  // deixando os Jogos em destaque no topo (ver cartão logo no início da grade, abaixo).
  const financeiroCard: CartaoModulo = {
    href: "/financeiro",
    titulo: "Prestação de Contas",
    descricao: totalPrevisto > 0 ? `${formatMoeda(totalPrevisto)} previsto` : "Nenhum gasto lançado ainda",
    icone: IconFinanceiro,
    corBarra: "bg-blue-700",
    corBg: "bg-blue-50",
    corIcone: "text-blue-700",
  };

  return (
    <AppShell>
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Início
      </Link>
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <JuventusCrestMark className="h-12 w-12" />
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol Profissional</h1>
      </div>

      {/* Faixa de resumo — números gerais das áreas, pra dar uma visão rápida antes de entrar em
          cada módulo. */}
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-gradient-to-br from-grena to-grena-escuro p-5 text-white sm:grid-cols-4">
        <div>
          <p className="text-xl font-extrabold sm:text-2xl">{totalAtletas}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Atletas ativos</p>
        </div>
        <div>
          <p className="text-xl font-extrabold sm:text-2xl">{totalStaff}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Staff ativo</p>
        </div>
        <div>
          <p className="text-xl font-extrabold sm:text-2xl">{formatMoeda(totalPrevisto)}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Previsto</p>
        </div>
        <div>
          <p className="text-xl font-extrabold sm:text-2xl">
            {proximoJogo ? formatData(proximoJogo.data_jogo) : "—"}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Próximo jogo</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Jogos / Competições vem primeiro agora, a pedido do usuário. */}
        <Link
          href="/jogos"
          className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-red-700" />
          <SetaCartao />
          <IconBadge icone={IconJogos} corBg="bg-red-50" corIcone="text-red-700" />
          <h2 className="text-lg font-bold text-grena-escuro">Jogos / Competições</h2>
          {proximoJogo ? (
            <>
              <div className="flex items-center gap-3">
                {logoEsquerda}
                <span className="text-sm font-bold text-neutral-300">×</span>
                {logoDireita}
              </div>
              <p className="-mt-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
                {proximoJogo.competicao}
              </p>
              <p className="-mt-1 text-sm font-medium text-neutral-500">
                {formatData(proximoJogo.data_jogo)}
                {formatHorario(proximoJogo.horario) ? ` · ${formatHorario(proximoJogo.horario)}` : ""}
              </p>
              {proximoJogo.local_estadio ? (
                <p className="-mt-1 text-xs text-neutral-400">{proximoJogo.local_estadio}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-medium text-neutral-500">Nenhum jogo agendado</p>
          )}
        </Link>

        {CADASTROS.map((item) => (
          <CartaoCadastro key={item.href} item={item} />
        ))}

        {/* Staff Operacional fica sozinho na segunda linha — é o cartão mais simples (só o
            número de ativos), então sobra menos espaço vazio nessa linha do que sobraria com
            Jogos (que tem bem mais conteúdo). */}
        <Link
          href="/staff-operacional"
          className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-amber-600" />
          <SetaCartao />
          <IconBadge icone={IconStaff} corBg="bg-amber-50" corIcone="text-amber-700" />
          <h2 className="text-lg font-bold text-grena-escuro">Staff Operacional</h2>
          <p className="text-sm font-medium text-neutral-500">
            {totalStaff} ativo{totalStaff === 1 ? "" : "s"}
          </p>
        </Link>

        {/* Prestação de Contas agora fica por último, a pedido do usuário. */}
        <CartaoCadastro item={financeiroCard} />
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
