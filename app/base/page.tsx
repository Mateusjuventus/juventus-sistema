import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getModulosBasePermitidos } from "@/lib/auth/role";
import { MODULOS_BASE, type ModuloBaseChave } from "@/lib/auth/modulos-base";
import { inicioDaSemana, somarDias } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";

/** Todos os módulos do Futebol de Base já construídos — a lista de "Em breve" abaixo fica sempre
 * vazia agora, mas o filtro continua aqui por segurança, caso um novo módulo seja adicionado no
 * futuro sem ganhar um cartão de imediato. */
const MODULOS_CONSTRUIDOS: ModuloBaseChave[] = [
  "atletas",
  "comissao_tecnica",
  "staff_operacional",
  "jogos",
  "programacao",
  "solicitacoes",
  "estoque",
  "financeiro",
  "relatorios_avulso",
  "captacao",
  "alojamento",
];

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

function IconJogos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function IconFinanceiro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 3v18M8 7h5.5a2.5 2.5 0 010 5H8m0 0h6a2.5 2.5 0 010 5H8" />
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

function IconEstoque({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

function IconRelatorio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 3h6l4 4v13a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15h6M9 18h3" />
    </svg>
  );
}

function IconCaptacao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 19c0-3 2.5-4.5 5.5-4.5" />
      <circle cx="16.5" cy="16.5" r="3.2" />
      <path d="M19 19l2.5 2.5" />
    </svg>
  );
}

function IconProgramacao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconAlojamento({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 19v-8a1 1 0 011-1h16a1 1 0 011 1v8" />
      <path d="M3 19v-3h18v3M3 16v-2.5a1 1 0 011-1h6.5V16M13.5 12.5H20a1 1 0 011 1V16" />
      <circle cx="7" cy="10" r="1.3" />
    </svg>
  );
}

export default async function BasePage() {
  const supabase = createClient();
  const modulosPermitidos = await getModulosBasePermitidos(supabase);
  const temModulo = (chave: ModuloBaseChave) => modulosPermitidos.includes(chave);

  const inicioSemanaAtual = inicioDaSemana(hojeBrasilia());
  const fimSemanaAtual = somarDias(inicioSemanaAtual, 6);

  const [
    { count: totalAtletasCount },
    { count: totalComissaoCount },
    { count: totalStaffCount },
    { count: totalJogosCount },
    { count: totalProgramacaoSemanaCount },
    { count: totalSolicitacoesPendentesCount },
    { count: totalEstoqueItensCount },
    { count: totalCaptacaoEmAvaliacaoCount },
    { count: totalAlojadosCount },
  ] = await Promise.all([
    supabase.from("atletas_base").select("*", { count: "exact", head: true }),
    supabase.from("comissao_tecnica_base").select("*", { count: "exact", head: true }),
    supabase.from("staff_operacional_base").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("jogos_base").select("*", { count: "exact", head: true }),
    supabase
      .from("programacao_atividades")
      .select("*", { count: "exact", head: true })
      .gte("data", inicioSemanaAtual)
      .lte("data", fimSemanaAtual),
    supabase.from("solicitacoes_base").select("*", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("estoque_itens_base").select("*", { count: "exact", head: true }),
    supabase.from("captacao_base").select("*", { count: "exact", head: true }).eq("status", "avaliacao"),
    supabase.from("atletas_base").select("*", { count: "exact", head: true }).eq("alojado", true),
  ]);
  const totalAtletas = totalAtletasCount ?? 0;
  const totalComissao = totalComissaoCount ?? 0;
  const totalStaff = totalStaffCount ?? 0;
  const totalJogos = totalJogosCount ?? 0;
  const totalProgramacaoSemana = totalProgramacaoSemanaCount ?? 0;
  const totalSolicitacoesPendentes = totalSolicitacoesPendentesCount ?? 0;
  const totalEstoqueItens = totalEstoqueItensCount ?? 0;
  const totalCaptacaoEmAvaliacao = totalCaptacaoEmAvaliacaoCount ?? 0;
  const totalAlojados = totalAlojadosCount ?? 0;

  const emBreve = MODULOS_BASE.filter(
    (m) => !MODULOS_CONSTRUIDOS.includes(m.chave) && temModulo(m.chave),
  );

  return (
    <AppShell departamento="futebol_base">
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Início
      </Link>
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <JuventusCrest className="h-14 w-auto" />
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {temModulo("atletas") ? (
          <Link
            href="/base/atletas"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IconAtletas className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Atletas</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalAtletas} cadastrado{totalAtletas === 1 ? "" : "s"}
            </p>
          </Link>
        ) : null}

        {temModulo("comissao_tecnica") ? (
          <Link
            href="/base/comissao-tecnica"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-teal-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <IconComissao className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Comissão Técnica / Diretoria</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalComissao} cadastrado{totalComissao === 1 ? "" : "s"}
            </p>
          </Link>
        ) : null}

        {temModulo("staff_operacional") ? (
          <Link
            href="/base/staff-operacional"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-amber-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <IconStaff className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Staff Operacional</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalStaff} ativo{totalStaff === 1 ? "" : "s"}
            </p>
          </Link>
        ) : null}

        {temModulo("jogos") ? (
          <Link
            href="/base/jogos"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <IconJogos className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Jogos / Competições</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalJogos} jogo{totalJogos === 1 ? "" : "s"} cadastrado{totalJogos === 1 ? "" : "s"}
            </p>
          </Link>
        ) : null}

        {temModulo("programacao") ? (
          <Link
            href="/base/programacao"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-fuchsia-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600">
              <IconProgramacao className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Programação</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalProgramacaoSemana} atividade{totalProgramacaoSemana === 1 ? "" : "s"} nesta semana
            </p>
          </Link>
        ) : null}

        {temModulo("financeiro") ? (
          <Link
            href="/base/financeiro"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-rose-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <IconFinanceiro className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Financeiro</h2>
            <p className="text-sm font-medium text-neutral-500">Prestação de contas dos jogos + gasto geral da Base</p>
          </Link>
        ) : null}

        {temModulo("solicitacoes") ? (
          <Link
            href="/base/solicitacoes"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-purple-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <IconSolicitacoes className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Solicitações</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalSolicitacoesPendentes > 0
                ? `${totalSolicitacoesPendentes} pendente${totalSolicitacoesPendentes === 1 ? "" : "s"}`
                : "Nenhuma pendente"}
            </p>
          </Link>
        ) : null}

        {temModulo("estoque") ? (
          <Link
            href="/base/estoque"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-indigo-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <IconEstoque className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Estoque</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalEstoqueItens > 0
                ? `${totalEstoqueItens} ite${totalEstoqueItens === 1 ? "m" : "ns"} cadastrado${totalEstoqueItens === 1 ? "" : "s"}`
                : "Nenhum item cadastrado ainda"}
            </p>
          </Link>
        ) : null}

        {temModulo("relatorios_avulso") ? (
          <Link
            href="/base/relatorios/avulso"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-cyan-700" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <IconRelatorio className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Relatório Avulso</h2>
            <p className="text-sm font-medium text-neutral-500">Monte uma lista em PDF do seu jeito</p>
          </Link>
        ) : null}

        {temModulo("captacao") ? (
          <Link
            href="/base/captacao"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <IconCaptacao className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Captação/Avaliação</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalCaptacaoEmAvaliacao} em avaliação
            </p>
          </Link>
        ) : null}

        {temModulo("alojamento") ? (
          <Link
            href="/base/alojamento"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-sky-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <IconAlojamento className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Alojamento</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalAlojados} alojado{totalAlojados === 1 ? "" : "s"}
            </p>
          </Link>
        ) : null}
      </div>

      {emBreve.length > 0 ? (
        <>
          <h2 className="mt-10 text-center text-lg font-semibold text-neutral-500">Em breve</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {emBreve.map((m) => (
              <div
                key={m.chave}
                className="card flex flex-col items-center gap-3 p-8 text-center opacity-60"
                aria-disabled
              >
                <span className="inline-block h-1 w-10 rounded bg-prata" />
                <h3 className="text-xl font-bold text-neutral-600">{m.label}</h3>
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
