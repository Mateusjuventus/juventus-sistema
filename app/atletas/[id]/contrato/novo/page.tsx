import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ContratoForm } from "@/components/contrato-form";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { criarContrato } from "../actions";

/** Formulário dedicado de "Novo contrato" — ver comentário em `../page.tsx` e na spec sobre por que
 * isso é uma página própria (bastante campo: tipo + condicional + vigência + 5 valores) em vez de
 * inline na tela de Contrato. */
export default function NovoContratoAtletaPage({ params }: { params: { id: string } }) {
  return (
    <AppShell breadcrumb="Novo contrato">
      <Link href={`/atletas/${params.id}/contrato`} className="text-sm font-medium text-grena hover:underline">
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
          camposExtras={{ atletaId: params.id }}
        />
      </div>
    </AppShell>
  );
}
