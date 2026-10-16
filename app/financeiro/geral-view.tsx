import { createClient } from "@/lib/supabase/server";
import { podeVerCampoSensivel } from "@/lib/auth/role";
import {
  calcularGeralProfissional,
  custoAtletaProfissional,
  mapaContratoVigentePorAtleta,
  tipoPagamentoAtletaProfissional,
} from "@/lib/futebol/financeiro";
import { DonutComposicao, type FatiaComposicao } from "@/components/charts/donut-composicao";
import type { AtletaContratoRow, AtletaRow, ComissaoTecnicaRow } from "@/lib/supabase/types";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-grena-escuro">{valor}</p>
    </div>
  );
}

/**
 * Conteúdo da aba "Geral" de `/financeiro` (Profissional, `?aba=geral`) — soma salário da Comissão
 * Técnica + total do contrato vigente de cada atleta. Espelha a aba "Geral da Base"
 * (`app/base/financeiro/geral-base-view.tsx`), mas mais simples: sem despesas avulsas (ficam só na
 * aba "Jogos") e sem quebra "por categoria" (o Profissional não tem categorias de idade). Ver
 * docs/superpowers/specs/2026-10-16-financeiro-contrato-design.md — o cálculo em si vive em
 * `lib/futebol/financeiro.ts`, reaproveitado pelo PDF desta mesma aba (`./pdf-geral/route.tsx`).
 */
export async function GeralProfissionalView() {
  const supabase = createClient();

  const [{ data: comissaoData }, { data: atletasData }, { data: contratosData }, podeVerSalario] =
    await Promise.all([
      supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true }),
      supabase.from("atletas").select("*").order("nome_completo", { ascending: true }),
      supabase.from("atleta_contratos").select("*").eq("vigente", true),
      podeVerCampoSensivel(supabase, "salario"),
    ]);

  const comissao = (comissaoData ?? []) as ComissaoTecnicaRow[];
  const atletas = (atletasData ?? []) as AtletaRow[];
  const contratosVigentes = (contratosData ?? []) as AtletaContratoRow[];
  const contratoPorAtleta = mapaContratoVigentePorAtleta(contratosVigentes);

  const { custoComissao, custoAtletas, totalGeral } = calcularGeralProfissional(
    comissao,
    atletas,
    contratosVigentes,
  );

  // As mesmas 2 cores da marca usadas na Base pra Comissão/Atletas (ver geral-base-view.tsx) — sem
  // a 3ª fatia de despesas avulsas, que não entra aqui.
  const composicao: FatiaComposicao[] = [
    { label: "Comissão Técnica", valor: custoComissao, cor: "#5C0A35" },
    { label: "Atletas", valor: custoAtletas, cor: "#B98F1E" },
  ];

  if (!podeVerSalario) {
    return (
      <div className="card mt-4 p-8 text-center text-neutral-400">
        Você não tem permissão para ver os valores desta aba.
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href="/financeiro/pdf-geral"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Gerar Relatório PDF
        </a>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Custo com Comissão Técnica" valor={formatMoeda(custoComissao)} />
        <StatCard label="Custo com Atletas" valor={formatMoeda(custoAtletas)} />
        <StatCard label="Total geral" valor={formatMoeda(totalGeral)} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Composição do gasto</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Passe o mouse numa fatia ou na legenda pra ver o valor exato.
      </p>
      <div className="card mt-3 p-5">
        <DonutComposicao fatias={composicao} total={totalGeral} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Comissão Técnica</h2>
      <div className="card tabela-rolavel mt-3">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Salário mensal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {comissao.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-neutral-800">{c.nome_completo}</td>
                <td className="px-4 py-3">{c.funcao}</td>
                <td className="px-4 py-3">{c.valor_salario ? formatMoeda(c.valor_salario) : "—"}</td>
              </tr>
            ))}
            {comissao.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum integrante da Comissão Técnica cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {comissao.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3">{formatMoeda(custoComissao)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Atletas</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Todo atleta cadastrado aparece aqui — &ldquo;—&rdquo; quando não há contrato cadastrado. O
        valor vem do contrato vigente (soma das 5 rubricas); o Tipo vem do tipo de contrato.
      </p>
      <div className="card tabela-rolavel mt-3">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {atletas.map((a) => {
              const valor = custoAtletaProfissional(a, contratoPorAtleta);
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{a.nome_completo}</td>
                  <td className="px-4 py-3">{tipoPagamentoAtletaProfissional(a.tipo_contrato)}</td>
                  <td className="px-4 py-3">{valor ? formatMoeda(valor) : "—"}</td>
                </tr>
              );
            })}
            {atletas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum atleta cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {atletas.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3">{formatMoeda(custoAtletas)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  );
}
