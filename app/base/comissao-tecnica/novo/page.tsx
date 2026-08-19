import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ComissaoBaseForm } from "../comissao-base-form";
import { createComissaoBase } from "../actions";

/** `?categoria=` só pré-marca o checkbox correspondente (ex.: veio do filtro da lista) — não é
 * mais uma exigência de rota, a pessoa pode marcar quantas quiser no formulário. */
export default function NovaComissaoBasePage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoriaInicial = ehCategoriaBaseValida(searchParams.categoria ?? "")
    ? [searchParams.categoria!]
    : [];

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/comissao-tecnica" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova pessoa — Comissão Técnica/Diretoria</h1>
      <div className="mt-4">
        <ComissaoBaseForm
          action={createComissaoBase}
          categoriasIniciais={categoriaInicial}
          submitLabel="Cadastrar"
        />
      </div>
    </AppShell>
  );
}
