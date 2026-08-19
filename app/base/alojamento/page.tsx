import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { calcularVagasAlojamento } from "@/lib/futebol/alojamento";
import type { AlojamentoBaseConfigRow, AtletaBaseRow } from "@/lib/supabase/types";
import { atualizarConfigAlojamento } from "./actions";
import { AlojamentoConfigForm } from "./config-form";

/**
 * Alojamento do clube: capacidade total (configurável aqui) e a relação de quem está morando lá —
 * lido direto de `atletas_base.alojado = true` (ver docs/superpowers/specs/
 * 2026-08-19-captacao-base-design.md e lib/futebol/alojamento.ts).
 */
export default async function AlojamentoPage() {
  const supabase = createClient();

  const [{ data: configData }, { data: alojadosData }] = await Promise.all([
    supabase.from("alojamento_base_config").select("*").limit(1).maybeSingle(),
    supabase
      .from("atletas_base")
      .select("*")
      .eq("alojado", true)
      .order("nome_completo", { ascending: true }),
  ]);

  const config = configData as AlojamentoBaseConfigRow | null;
  const alojados = (alojadosData ?? []) as AtletaBaseRow[];
  const vagas = calcularVagasAlojamento(config?.capacidade_total ?? 0, alojados.length);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Alojamento" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Quem está alojado vem do cadastro de cada atleta — marque a opção Mora no alojamento do
        clube lá pra essa pessoa aparecer aqui.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-grena-escuro">{vagas.capacidadeTotal}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Vagas totais</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-grena-escuro">{vagas.alojados}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Alojados</p>
        </div>
        <div className="card p-4 text-center">
          <p className={`text-2xl font-bold ${vagas.acimaDaCapacidade ? "text-red-700" : "text-emerald-700"}`}>
            {vagas.disponiveis}
          </p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Vagas disponíveis</p>
        </div>
      </div>

      {vagas.acimaDaCapacidade ? (
        <p className="card mt-3 border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          Há mais gente alojada do que a capacidade cadastrada — confira os cadastros ou atualize o
          número de vagas totais abaixo.
        </p>
      ) : null}

      <div className="card mt-4 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-grena-escuro">
          Capacidade do alojamento
        </h2>
        {config ? (
          <AlojamentoConfigForm
            action={atualizarConfigAlojamento.bind(null, config.id)}
            capacidadeInicial={config.capacidade_total}
            observacoesIniciais={config.observacoes ?? ""}
          />
        ) : null}
      </div>

      {alojados.length === 0 ? (
        <p className="card mt-4 p-6 text-center text-sm text-neutral-400">Ninguém alojado no momento.</p>
      ) : (
        <section className="card tabela-rolavel mt-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Ajuda de custo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {alojados.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/base/atletas/${a.categoria}/${a.id}`}
                      className="font-medium text-grena hover:underline"
                    >
                      {a.nome_completo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{categoriaBaseLabel(a.categoria)}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {a.valor_ajuda_custo != null ? `R$ ${a.valor_ajuda_custo.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AppShell>
  );
}
