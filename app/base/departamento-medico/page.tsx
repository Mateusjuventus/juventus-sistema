import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import type { FisioterapiaLesaoBaseRow } from "@/lib/supabase/types";

/**
 * Porta de entrada do módulo "Saúde e Performance" (Futebol de Base) — espelha
 * `app/departamento-medico/page.tsx` (Profissional). Ver docs/superpowers/specs/
 * 2026-10-06-reorganizacao-sidebar-design.md, adendo "Saúde e Performance vira módulo com
 * ramificações". O link da sidebar passa a apontar pra cá (`/base/departamento-medico`) em vez de
 * direto pra `/base/departamento-medico/fisioterapia`; o bloqueio de acesso continua sendo o mesmo
 * módulo (`departamento_medico`), já que o prefixo cobre as duas rotas. Contagem restrita às
 * categorias que o usuário logado pode ver, igual à própria listagem de Fisioterapia.
 */
export default async function DepartamentoMedicoBasePage() {
  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const [{ data: atletasData }, { data: lesoesAtivasData }] = await Promise.all([
    supabase.from("atletas_base").select("id").eq("ativo", true).in("categoria", categoriasPermitidas),
    supabase
      .from("fisioterapia_lesoes_base")
      .select("atleta_id")
      .is("data_fim", null)
      .not("data_inicio", "is", null),
  ]);

  const idsPermitidos = new Set((atletasData ?? []).map((a) => a.id as string));
  const totalAtletas = idsPermitidos.size;
  // Só conta lesões de atletas dentro das categorias permitidas — sem isso, alguém restrito a
  // Sub-11/Sub-14 veria "em tratamento" somando atletas de categorias que ele nem enxerga.
  const emTratamento = new Set(
    ((lesoesAtivasData ?? []) as Pick<FisioterapiaLesaoBaseRow, "atleta_id">[])
      .map((l) => l.atleta_id)
      .filter((id) => idsPermitidos.has(id)),
  ).size;

  return (
    <AppShell departamento="futebol_base" breadcrumb="Saúde e Performance">
      <p className="mt-1 text-center text-sm text-neutral-500">Escolha uma área.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/base/departamento-medico/fisioterapia"
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
