import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ContratoForm } from "@/components/contrato-form";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { criarContrato } from "../actions";

/**
 * Formulário dedicado de "Novo contrato" — página própria (bastante campo: tipo + condicional +
 * vigência + 5 valores) em vez de inline. Alcançado tanto pela tela "Ver atleta" quanto por
 * "Editar atleta" (desde 2026-10-16 o Contrato não é mais uma aba própria — ver
 * `components/contrato-secao.tsx`), então `origem` (na query string do link que trouxe até aqui)
 * diz pra qual das duas a action deve redirecionar de volta depois de salvar.
 */
export default function NovoContratoAtletaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { origem?: string };
}) {
  const origem = searchParams.origem === "editar" ? "editar" : "ver";
  const voltarHref = origem === "editar" ? `/atletas/${params.id}` : `/atletas/${params.id}/ver`;

  return (
    <AppShell breadcrumb="Novo contrato">
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo contrato</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ao salvar, o contrato vigente atual (se existir) é encerrado automaticamente e vira histórico.
      </p>
      <div className="mt-4">
        <ContratoForm
          action={criarContrato}
          tipoContratoOptions={ATLETA_TIPO_CONTRATO_OPTIONS}
          camposExtras={{ atletaId: params.id, origem }}
        />
      </div>
    </AppShell>
  );
}
