import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import {
  agruparPorBloco,
  atletasSemContratoParaAviso,
  calcularListaFinal,
  valorTotalContrato,
  type AtletaParaRelacao,
  type ExcecaoRelacao,
  type LinhaRelacao,
} from "@/lib/futebol/relacao-formacao-profissional";
import type { AtletaContratoRow, AtletaRelacaoFormacaoProfissionalExcecaoRow, AtletaRow } from "@/lib/supabase/types";
import { criarExcecao, removerExcecao } from "./actions";
import { AdicionarExcecaoForm, type AtletaCandidato } from "./adicionar-excecao-form";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tipoContratoLabel(valor: string): string {
  return ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === valor)?.label ?? valor;
}

function TabelaBloco({ titulo, linhas }: { titulo: string; linhas: LinhaRelacao[] }) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
        {titulo} ({linhas.length})
      </h2>
      {linhas.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">Nenhum atleta nesta relação.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase text-neutral-500">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Tipo de contrato</th>
                <th className="py-2 pr-3">Vigência</th>
                <th className="py-2 pr-3">Valor total</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.atleta.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-3 font-medium text-neutral-800">{l.atleta.nomeCompleto}</td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {tipoContratoLabel(l.contrato.tipo_contrato)}
                    {l.contrato.tipo_contrato === "emprestimo" && l.contrato.clube_origem ? ` (${l.contrato.clube_origem})` : ""}
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {formatData(l.contrato.vigencia_inicio)} – {formatData(l.contrato.vigencia_fim)}
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">{formatMoeda(valorTotalContrato(l.contrato))}</td>
                  <td className="py-2 pr-3 text-right">
                    <form action={criarExcecao}>
                      <input type="hidden" name="atletaId" value={l.atleta.id} />
                      <input type="hidden" name="tipo" value="excluir" />
                      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                        Remover da relação
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Relação mensal de atletas (Formação e Profissional) pro Financeiro/Controladoria — ver
 * docs/superpowers/specs/2026-11-26-relacao-formacao-profissional-design.md. Inclusão automática
 * (categoria de Base + contrato vigente de Formação/Definitivo/Empréstimo + status diferente de
 * "dispensado" + ativo) com exceções manuais persistentes. Só master (dado financeiro sensível,
 * mesmo padrão das demais telas restritas do sistema).
 */
export default async function RelacaoFormacaoProfissionalPage() {
  const supabase = createClient();
  if (!(await isMaster(supabase))) redirect("/base");

  const [{ data: atletasData }, { data: contratosData }, { data: excecoesData }] = await Promise.all([
    supabase
      .from("atletas")
      .select("id, nome_completo, cpf, data_nascimento, status, ativo, categoria")
      .order("nome_completo", { ascending: true }),
    supabase.from("atleta_contratos").select("*").eq("vigente", true),
    supabase.from("atleta_relacao_formacao_profissional_excecoes").select("*"),
  ]);

  type AtletaCampos = Pick<AtletaRow, "id" | "nome_completo" | "cpf" | "data_nascimento" | "status" | "ativo" | "categoria">;
  const atletas = (atletasData ?? []) as AtletaCampos[];
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const excecoes = (excecoesData ?? []) as AtletaRelacaoFormacaoProfissionalExcecaoRow[];

  const contratoPorAtleta = new Map(contratos.map((c) => [c.atleta_id, c]));
  const todosParaRelacao: AtletaParaRelacao[] = atletas.map((a) => ({
    id: a.id,
    nomeCompleto: a.nome_completo,
    cpf: a.cpf,
    dataNascimento: a.data_nascimento,
    status: a.status,
    ativo: a.ativo,
    categoria: a.categoria,
    contratoVigente: contratoPorAtleta.get(a.id) ?? null,
  }));

  const excecoesParaLib: ExcecaoRelacao[] = excecoes.map((e) => ({ atletaId: e.atleta_id, tipo: e.tipo }));
  const listaFinal = calcularListaFinal(todosParaRelacao, excecoesParaLib);
  const { formacao, profissional } = agruparPorBloco(listaFinal);
  const semContrato = atletasSemContratoParaAviso(listaFinal);

  const idsNaLista = new Set(listaFinal.map((a) => a.id));
  const candidatosFora: AtletaCandidato[] = atletas
    .filter((a) => !idsNaLista.has(a.id))
    .map((a) => ({ id: a.id, nome: a.nome_completo }));

  const atletaPorId = new Map(atletas.map((a) => [a.id, a]));

  return (
    <AppShell departamento="futebol_base" breadcrumb="Relação Formação e Profissional">
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Relação de Atletas — Formação e Profissional</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Lista mensal pro Financeiro/Controladoria: atletas do Futebol de Base com contrato de
        Formação, Definitivo ou Empréstimo vigente. Entra e sai automaticamente conforme os
        contratos mudam — use as exceções abaixo só pra ajustar um caso pontual.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/base/relatorios/formacao-profissional/pdf" className="btn-primary">
          Baixar PDF
        </a>
        <a href="/base/relatorios/formacao-profissional/export" className="btn-secondary">
          Baixar Excel
        </a>
      </div>

      <div className="mt-6 space-y-4">
        <TabelaBloco titulo="Formação" linhas={formacao} />
        <TabelaBloco titulo="Profissional" linhas={profissional} />
      </div>

      {semContrato.length > 0 ? (
        <div className="card mt-4 border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-800">Incluído manualmente, mas sem contrato vigente</h3>
          <p className="mt-1 text-xs text-amber-700">
            Não aparece no PDF/Excel (não tem rubrica nem tipo de contrato pra mostrar) — lance um
            contrato ou remova a exceção.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {semContrato.map((a) => (
              <li key={a.id}>{a.nomeCompleto}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <AdicionarExcecaoForm atletas={candidatosFora} />
      </div>

      <div className="card mt-4 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">Exceções ativas</h3>
        {excecoes.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhuma exceção manual no momento.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {excecoes.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {atletaPorId.get(e.atleta_id)?.nome_completo ?? "(atleta não encontrado)"} —{" "}
                  <span className={e.tipo === "incluir" ? "text-green-700" : "text-red-700"}>
                    {e.tipo === "incluir" ? "Sempre incluir" : "Sempre excluir"}
                  </span>
                </span>
                <form action={removerExcecao}>
                  <input type="hidden" name="atletaId" value={e.atleta_id} />
                  <button type="submit" className="text-xs font-medium text-grena hover:underline">
                    Remover exceção
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
