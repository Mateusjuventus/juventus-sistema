import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { FisioterapiaLesaoRow } from "@/lib/supabase/types";

/**
 * Hub do módulo Departamento Médico — mesmo papel de `/estoque` (porta de entrada com um cartão por
 * sub-área). Por ora só existe a sub-área Fisioterapia; a estrutura já fica pronta pra caber outras
 * no futuro (ex.: Médico, Nutrição) sem precisar remodelar nada — ver docs/superpowers/specs/
 * 2026-09-30-fisioterapia-design.md.
 */
export default async function DepartamentoMedicoPage() {
  const supabase = createClient();
  const { data } = await supabase.from("fisioterapia_lesoes").select("atleta_id").is("data_fim", null);
  const lesoesAtivas = (data ?? []) as Pick<FisioterapiaLesaoRow, "atleta_id">[];
  const atletasEmTratamento = new Set(lesoesAtivas.map((l) => l.atleta_id)).size;

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Departamento Médico" />
      <p className="mt-1 text-center text-sm text-neutral-500">Escolha a área.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/departamento-medico/fisioterapia"
          className="card group relative flex flex-col gap-2 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-grena" />
          <h2 className="text-lg font-bold text-grena-escuro">Fisioterapia</h2>
          <p className="text-sm font-medium text-neutral-500">
            {atletasEmTratamento} atleta{atletasEmTratamento === 1 ? "" : "s"} em tratamento agora
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
