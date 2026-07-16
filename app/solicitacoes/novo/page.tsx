import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SolicitacaoForm } from "../solicitacao-form";
import { createSolicitacao } from "../actions";

export default function NovaSolicitacaoPage() {
  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <Link href="/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova solicitação</h1>
      <div className="mt-4">
        <SolicitacaoForm
          action={createSolicitacao}
          defaultValues={{
            dataSolicitacao: hojeStr,
            solicitante: "Mateus dos Santos Pereira",
            setor: "Futebol Profissional",
          }}
          submitLabel="Cadastrar"
        />
      </div>
    </AppShell>
  );
}
