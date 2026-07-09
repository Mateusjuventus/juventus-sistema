import { AppShell } from "@/components/app-shell";
import { ComissaoForm } from "../comissao-form";
import { createComissao } from "../actions";

export default function NovaComissaoPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Nova pessoa — Comissão Técnica/Diretoria</h1>
      <div className="mt-4">
        <ComissaoForm action={createComissao} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
