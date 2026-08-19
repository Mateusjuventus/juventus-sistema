import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { criarCaptacao } from "../actions";
import { CaptacaoForm } from "../captacao-form";

export default function NovoCandidatoPage() {
  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/captacao" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Captação/Avaliação
      </Link>
      <PageHeader title="Novo Candidato" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Só o nome é obrigatório — o resto pode ser completado conforme a avaliação anda.
      </p>
      <div className="card mt-6 p-6">
        <CaptacaoForm action={criarCaptacao} submitLabel="Salvar candidato" />
      </div>
    </AppShell>
  );
}
