import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { AtletaBaseForm } from "../../atleta-base-form";
import { createAtletaBase } from "../../actions";

export default function NovoAtletaBasePage({ params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  return (
    <AppShell departamento="futebol_base">
      <Link href={`/base/atletas/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">
        Novo atleta — {categoriaBaseLabel(categoria)}
      </h1>
      <div className="mt-4">
        <AtletaBaseForm
          action={createAtletaBase}
          defaultValues={{ categoria }}
          submitLabel="Cadastrar atleta"
        />
      </div>
    </AppShell>
  );
}
