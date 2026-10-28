import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDepartamentosPermitidos } from "@/lib/auth/role";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaComissaoTecnicaValida } from "@/lib/auth/categorias-base";
import { ComissaoForm } from "../comissao-form";
import { createComissao } from "../actions";

/** Novo cadastro da Comissão Técnica/Diretoria unificada (Profissional + Base — ver
 * docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md). Quando chega com
 * `?categoria=`, vem direto do link "+ Nova pessoa" filtrado por categoria na lista — já marca essa
 * categoria no formulário. */
export default async function NovaComissaoPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const supabase = createClient();
  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const departamento =
    !departamentosPermitidos.includes("futebol_profissional") && departamentosPermitidos.includes("futebol_base")
      ? "futebol_base"
      : "futebol_profissional";
  const categoria = ehCategoriaComissaoTecnicaValida(searchParams.categoria ?? "") ? [searchParams.categoria!] : [];

  return (
    <AppShell departamento={departamento} breadcrumb="Nova pessoa — Comissão Técnica/Diretoria">
      <Link href="/comissao-tecnica" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova pessoa — Comissão Técnica/Diretoria</h1>
      <div className="mt-4">
        <ComissaoForm action={createComissao} categoriasIniciais={categoria} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
