import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { FisioterapiaLesaoRow } from "@/lib/supabase/types";

/**
 * Porta de entrada do módulo "Saúde e Performance" (Futebol Profissional) — mesmo padrão de
 * `app/estoque/page.tsx` ("um módulo só, mas com ramificações separadas"): um cartão por sub-área,
 * hoje só Fisioterapia, com espaço pronto pra outras entrarem no futuro (Nutrição, Preparação
 * Física etc.) sem precisar de mais nenhum ajuste na sidebar — ver docs/superpowers/specs/
 * 2026-10-06-reorganizacao-sidebar-design.md, adendo "Saúde e Performance vira módulo com
 * ramificações". O link da sidebar passa a apontar pra cá (`/departamento-medico`) em vez de direto
 * pra `/departamento-medico/fisioterapia`; o bloqueio de acesso continua sendo o mesmo módulo
 * (`departamento_medico`), já que o prefixo cobre as duas rotas.
 */
export default async function DepartamentoMedicoPage() {
  const supabase = createClient();

  const [{ data: atletasData }, { data: lesoesAtivasData }] = await Promise.all([
    supabase.from("atletas").select("id").eq("ativo", true),
    supabase.from("fisioterapia_lesoes").select("atleta_id").is("data_fim", null).not("data_inicio", "is", null),
  ]);

  const totalAtletas = (atletasData ?? []).length;
  const emTratamento = new Set(
    ((lesoesAtivasData ?? []) as Pick<FisioterapiaLesaoRow, "atleta_id">[]).map((l) => l.atleta_id),
  ).size;

  return (
    <AppShell breadcrumb="Saúde e Performance">
      <p className="mt-1 text-center text-sm text-neutral-500">Escolha uma área.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/departamento-medico/fisioterapia"
          className="card group relative flex flex-col gap-2 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-grena" />
          <h2 className="text-lg font-bold text-grena-escuro">Fisioterapia</h2>
          <p className="text-sm font-medium text-neutral-500">
            {totalAtletas} atleta{totalAtletas === 1 ? "" : "s"} · {emTratamento} em tratamento
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
