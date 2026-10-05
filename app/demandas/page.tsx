import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PessoaAcompanhadaCard } from "@/components/demandas/pessoa-acompanhada-card";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { calcularRendimento } from "@/lib/demandas/rendimento";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { DemandaRow, PerfilRow } from "@/lib/supabase/types";

/**
 * Painel do master — acompanha de uma vez todo mundo marcado em "Usuários" → "Painel de Demandas"
 * (supervisores, a Assistente Social etc.), um card ao lado do outro: foto, função e as 5 métricas
 * de rendimento (ver docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md,
 * Parte 2, "Painel do Mateus" — pedido original: "pra mim fique como se fosse um painel para
 * acompanhar todos de uma vez"). Só master acessa.
 */
export default async function DemandasPage() {
  const supabase = createClient();
  const master = await isMaster(supabase);
  if (!master) redirect("/profissional");

  const { data: perfisData } = await supabase.from("perfis").select("*").eq("demandas_acompanhado", true);
  const perfis = (perfisData ?? []) as PerfilRow[];
  const hojeStr = hojeBrasilia();

  const cards = await Promise.all(
    perfis.map(async (perfil) => {
      // Nome/função/foto: vínculo com a Comissão Técnica (Base tem prioridade sobre Profissional,
      // mesma regra de `resolverNomeCargoParaAssinatura`) quando existir, senão `perfis.nome`/
      // `cargo` de sempre e avatar de iniciais (sem foto cadastrada fora da Comissão Técnica).
      let nome = perfil.nome ?? perfil.email;
      let funcao = perfil.cargo ?? "—";
      let fotoPath: string | null = null;

      if (perfil.comissao_tecnica_base_id) {
        const { data } = await supabase
          .from("comissao_tecnica_base")
          .select("nome_completo, funcao, foto_path")
          .eq("id", perfil.comissao_tecnica_base_id)
          .maybeSingle();
        if (data) {
          nome = data.nome_completo;
          funcao = data.funcao;
          fotoPath = data.foto_path;
        }
      } else if (perfil.comissao_tecnica_id) {
        const { data } = await supabase
          .from("comissao_tecnica")
          .select("nome_completo, funcao, foto_path")
          .eq("id", perfil.comissao_tecnica_id)
          .maybeSingle();
        if (data) {
          nome = data.nome_completo;
          funcao = data.funcao;
          fotoPath = data.foto_path;
        }
      }

      const [{ data: demandasData }, fotoUrl] = await Promise.all([
        supabase.from("demandas").select("*").eq("responsavel_id", perfil.id),
        getSignedPhotoUrl(supabase, fotoPath),
      ]);
      const demandas = (demandasData ?? []) as DemandaRow[];
      const rendimento = calcularRendimento(demandas, hojeStr);
      const pendencias = demandas
        .filter((d) => d.status !== "concluido")
        .sort((a, b) => (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99"));

      return { id: perfil.id, nome: nome ?? "—", funcao, fotoUrl, rendimento, pendencias };
    }),
  );

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Demandas" />

      {cards.length === 0 ? (
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Ninguém está marcado pra acompanhar ainda. Em &quot;Usuários&quot;, marque &quot;Acompanhar
          no painel de Demandas&quot; pra cada pessoa.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <PessoaAcompanhadaCard
              key={c.id}
              nome={c.nome}
              funcao={c.funcao}
              fotoUrl={c.fotoUrl}
              rendimento={c.rendimento}
              pendencias={c.pendencias}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
