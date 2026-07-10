import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AtletaForm } from "../atleta-form";
import { createAtleta } from "../actions";

export default function NovoAtletaPage() {
  return (
    <AppShell>
      <Link href="/atletas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo atleta</h1>
      <div className="mt-4">
        <AtletaForm action={createAtleta} submitLabel="Cadastrar atleta" />
      </div>
    </AppShell>
  );
}
