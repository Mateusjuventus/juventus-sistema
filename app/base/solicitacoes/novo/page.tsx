import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SolicitacaoForm } from "../solicitacao-form";
import { createSolicitacaoBase } from "../actions";

export default function NovaSolicitacaoBasePage() {
  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova solicitação</h1>
      <div className="mt-4">
        <SolicitacaoForm
          action={createSolicitacaoBase}
          defaultValues={{
            dataSolicitacao: hojeStr,
            solicitante: "Mateus dos Santos Pereira",
            setor: "Futebol de Base",
          }}
          submitLabel="Cadastrar"
        />
      </div>
    </AppShell>
  );
}
