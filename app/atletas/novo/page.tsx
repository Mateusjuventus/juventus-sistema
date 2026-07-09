import { AppShell } from "@/components/app-shell";
import { AtletaForm } from "../atleta-form";
import { createAtleta } from "../actions";

export default function NovoAtletaPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Novo atleta</h1>
      <div className="mt-4">
        <AtletaForm action={createAtleta} submitLabel="Cadastrar atleta" />
      </div>
    </AppShell>
  );
}
