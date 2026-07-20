import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getDepartamentosPermitidos } from "@/lib/auth/role";

export default async function HomePage() {
  const supabase = createClient();
  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const temProfissional = departamentosPermitidos.includes("futebol_profissional");
  const temBase = departamentosPermitidos.includes("futebol_base");

  return (
    <AppShell nav="none">
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="mx-auto max-w-3xl text-center">
          <JuventusCrest className="mx-auto h-20 w-auto" />
          <h1 className="mt-4 text-3xl font-bold text-grena-escuro sm:text-4xl">Juventus - SAF</h1>
          <p className="mt-3 text-neutral-600">Escolha um departamento para começar.</p>
        </div>

        {temProfissional || temBase ? (
          <div className="mx-auto mt-10 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {temProfissional ? (
              <Link
                href="/profissional"
                className="card group flex flex-col items-center gap-4 p-10 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-dourado"
              >
                <JuventusCrest className="h-16 w-auto" />
                <h2 className="text-2xl font-bold text-grena-escuro">Futebol Profissional</h2>
                <span className="text-sm font-medium text-grena group-hover:underline">
                  Entrar →
                </span>
              </Link>
            ) : null}

            {temBase ? (
              <Link
                href="/base"
                className="card group flex flex-col items-center gap-4 p-10 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-dourado"
              >
                <JuventusCrest className="h-16 w-auto" />
                <h2 className="text-2xl font-bold text-grena-escuro">Futebol de Base</h2>
                <span className="text-sm font-medium text-grena group-hover:underline">
                  Entrar →
                </span>
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="card mx-auto mt-10 max-w-md p-6 text-center text-sm text-neutral-500">
            Nenhum departamento liberado pro seu usuário ainda. Fale com quem administra o sistema.
          </p>
        )}
      </div>
    </AppShell>
  );
}
