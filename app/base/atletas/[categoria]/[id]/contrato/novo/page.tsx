import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContratoForm } from "@/components/contrato-form";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { criarContratoBase } from "../actions";

/** Espelha `app/atletas/[id]/contrato/novo/page.tsx` para o Futebol de Base — mesma opção extra de
 * tipo de contrato (Iniciação) que o resto do cadastro da Base já tem, e o mesmo `origem` (Ver
 * atleta ou Editar atleta) pra saber pra onde voltar depois de salvar. */
export default function NovoContratoAtletaBasePage({
  params,
  searchParams,
}: {
  params: { categoria: string; id: string };
  searchParams: { origem?: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const origem = searchParams.origem === "editar" ? "editar" : "ver";
  const base = `/base/atletas/${params.categoria}/${params.id}`;
  const voltarHref = origem === "editar" ? base : `${base}/ver`;

  return (
    <AppShell departamento="futebol_base" breadcrumb="Novo contrato">
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo contrato</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ao salvar, o contrato vigente atual (se existir) é encerrado automaticamente e vira histórico.
      </p>
      <div className="mt-4">
        <ContratoForm
          action={criarContratoBase}
          tipoContratoOptions={ATLETA_BASE_TIPO_CONTRATO_OPTIONS}
          camposExtras={{ atletaId: params.id, categoria: params.categoria, origem }}
        />
      </div>
    </AppShell>
  );
}
