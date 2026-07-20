import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { ComissaoBaseForm } from "../../comissao-base-form";
import { createComissaoBase } from "../../actions";

export default function NovaComissaoBasePage({ params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  return (
    <AppShell departamento="futebol_base">
      <Link
        href={`/base/comissao-tecnica/${categoria}`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">
        Nova pessoa — {categoriaBaseLabel(categoria)}
      </h1>
      <div className="mt-4">
        <ComissaoBaseForm
          action={createComissaoBase}
          defaultValues={{ categoria }}
          submitLabel="Cadastrar"
        />
      </div>
    </AppShell>
  );
}
