import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import { montarResumoGeralFisioterapia } from "@/lib/futebol/fisioterapia";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import type {
  AtletaRow,
  FisioterapiaAtendimentoRow,
  FisioterapiaHistoricoImportadoRow,
  FisioterapiaLesaoRow,
  FisioterapiaQueixaRow,
} from "@/lib/supabase/types";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Visão consolidada do elenco (Relatório Geral) — quem está com lesão ativa agora, total de dias
 * afastados e a queixa mais recente de cada atleta. Ver docs/superpowers/specs/2026-09-30-
 * fisioterapia-design.md, seção 3.
 */
export default async function FisioterapiaRelatorioPage() {
  const supabase = createClient();

  const [{ data: atletasData }, { data: lesoesData }, { data: queixasData }, { data: atendimentosData }, { data: historicoGeralData }] =
    await Promise.all([
      supabase.from("atletas").select("id, nome_completo, apelido"),
      supabase.from("fisioterapia_lesoes").select("atleta_id, data_inicio, data_fim"),
      supabase.from("fisioterapia_queixas").select("atleta_id, data"),
      supabase.from("fisioterapia_atendimentos").select("atleta_id, quantidade"),
      supabase.from("fisioterapia_historico_importado").select("*").is("atleta_id", null).order("created_at", { ascending: true }),
    ]);

  const historicoGeral = (historicoGeralData ?? []) as FisioterapiaHistoricoImportadoRow[];
  const atletas = (atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "apelido">[];
  const linhas = montarResumoGeralFisioterapia(
    atletas.map((a) => ({ id: a.id, nome: nomeExibido({ apelido: a.apelido, nome_completo: a.nome_completo }) })),
    (lesoesData ?? []) as Pick<FisioterapiaLesaoRow, "atleta_id" | "data_inicio" | "data_fim">[],
    (queixasData ?? []) as Pick<FisioterapiaQueixaRow, "atleta_id" | "data">[],
    (atendimentosData ?? []) as Pick<FisioterapiaAtendimentoRow, "atleta_id" | "quantidade">[],
    hojeBrasilia(),
  );

  return (
    <AppShell largura="total" breadcrumb="Relatório Geral de Fisioterapia">
      <Link href="/departamento-medico/fisioterapia" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="flex justify-center">
        <a href="/departamento-medico/fisioterapia/relatorio/pdf" className="btn-secondary mt-3" target="_blank">
          Gerar relatório em PDF
        </a>
      </div>

      {historicoGeral.length > 0 ? (
        <section className="card mt-6 border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Histórico anterior ao sistema
          </h2>
          <ul className="mt-3 space-y-3">
            {historicoGeral.map((item) => (
              <li key={item.id} className="border-t border-neutral-200 pt-2">
                <p className="whitespace-pre-line text-sm text-neutral-600">{item.resumo}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="card mt-6 overflow-x-auto p-0">
        {linhas.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">Nenhum atleta com registro de Fisioterapia ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-2">Atleta</th>
                <th className="px-4 py-2">Em tratamento</th>
                <th className="px-4 py-2">Dias afastado (total)</th>
                <th className="px-4 py-2">Última queixa</th>
                <th className="px-4 py-2">Atendimentos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.atletaId} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/departamento-medico/fisioterapia/${linha.atletaId}`} className="font-medium text-grena hover:underline">
                      {linha.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {linha.emTratamento ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Sim</span>
                    ) : (
                      <span className="text-neutral-400">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{linha.totalDiasAfastados}</td>
                  <td className="px-4 py-2">{formatDataBr(linha.ultimaQueixaData)}</td>
                  <td className="px-4 py-2">{linha.totalAtendimentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
