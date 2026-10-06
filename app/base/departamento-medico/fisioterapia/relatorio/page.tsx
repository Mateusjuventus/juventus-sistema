import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { montarResumoGeralFisioterapia } from "@/lib/futebol/fisioterapia";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import type { AtletaBaseRow, FisioterapiaAtendimentoBaseRow, FisioterapiaLesaoBaseRow, FisioterapiaQueixaBaseRow } from "@/lib/supabase/types";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Visão consolidada do elenco da Base (Relatório Geral) — espelha `app/departamento-medico/
 * fisioterapia/relatorio/page.tsx` (Profissional), restrita às categorias que o usuário pode ver.
 * Sem filtro de categoria nesta tela (ver docs/superpowers/specs/2026-10-06-fisioterapia-base-
 * design.md): é a visão do elenco inteiro que o usuário pode ver, não uma navegação por categoria.
 */
export default async function FisioterapiaRelatorioBasePage() {
  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("id, nome_completo, apelido")
    .in("categoria", categoriasPermitidas);
  const atletas = (atletasData ?? []) as Pick<AtletaBaseRow, "id" | "nome_completo" | "apelido">[];
  const atletaIds = atletas.map((a) => a.id);

  const [{ data: lesoesData }, { data: queixasData }, { data: atendimentosData }] = await Promise.all([
    supabase.from("fisioterapia_lesoes_base").select("atleta_id, data_inicio, data_fim").in("atleta_id", atletaIds),
    supabase.from("fisioterapia_queixas_base").select("atleta_id, data").in("atleta_id", atletaIds),
    supabase.from("fisioterapia_atendimentos_base").select("atleta_id, quantidade").in("atleta_id", atletaIds),
  ]);

  const linhas = montarResumoGeralFisioterapia(
    atletas.map((a) => ({ id: a.id, nome: nomeExibido({ apelido: a.apelido, nome_completo: a.nome_completo }) })),
    (lesoesData ?? []) as Pick<FisioterapiaLesaoBaseRow, "atleta_id" | "data_inicio" | "data_fim">[],
    (queixasData ?? []) as Pick<FisioterapiaQueixaBaseRow, "atleta_id" | "data">[],
    (atendimentosData ?? []) as Pick<FisioterapiaAtendimentoBaseRow, "atleta_id" | "quantidade">[],
    hojeBrasilia(),
  );

  return (
    <AppShell departamento="futebol_base" largura="total" breadcrumb="Relatório Geral de Fisioterapia">
      <Link href="/base/departamento-medico/fisioterapia" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="flex justify-center">
        <a href="/base/departamento-medico/fisioterapia/relatorio/pdf" className="btn-secondary mt-3" target="_blank">
          Gerar relatório em PDF
        </a>
      </div>

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
                    <Link
                      href={`/base/departamento-medico/fisioterapia/${linha.atletaId}`}
                      className="font-medium text-grena hover:underline"
                    >
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
