import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JogoBaseForm } from "../jogo-form-base";
import { createJogoBase } from "../actions";

export default function NovoJogoBasePage() {
  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo jogo</h1>
      <div className="mt-4">
        <JogoBaseForm action={createJogoBase} submitLabel="Cadastrar jogo" />
      </div>
    </AppShell>
  );
}
