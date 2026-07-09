import { AppShell } from "@/components/app-shell";
import { JogoForm } from "../jogo-form";
import { createJogo } from "../actions";

export default function NovoJogoPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Novo jogo</h1>
      <div className="mt-4">
        <JogoForm action={createJogo} submitLabel="Cadastrar jogo" />
      </div>
    </AppShell>
  );
}
