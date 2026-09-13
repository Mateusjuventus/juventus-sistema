import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { JogoBaseForm } from "../jogo-form-base";
import { createJogoBase } from "../actions";

export default async function NovoJogoBasePage() {
  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo jogo</h1>
      <div className="mt-4">
        <JogoBaseForm
          action={createJogoBase}
          submitLabel="Cadastrar jogo"
          categoriasPermitidas={categoriasPermitidas}
        />
      </div>
    </AppShell>
  );
}
