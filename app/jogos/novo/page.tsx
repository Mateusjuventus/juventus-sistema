import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JogoForm } from "../jogo-form";
import { createJogo } from "../actions";

export default function NovoJogoPage() {
  return (
    <AppShell>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo jogo</h1>
      <div className="mt-4">
        <JogoForm action={createJogo} submitLabel="Cadastrar jogo" />
      </div>
    </AppShell>
  );
}
