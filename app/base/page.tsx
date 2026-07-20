import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SproutIcon } from "@/components/department-icon";
import { createClient } from "@/lib/supabase/server";
import { getModulosBasePermitidos } from "@/lib/auth/role";
import { MODULOS_BASE, type ModuloBaseChave } from "@/lib/auth/modulos-base";

/** Só os módulos já construídos do Futebol de Base (Fase 1 = Atletas) ganham um cartão de
 * verdade aqui — os demais (Fases 2-4, ver a spec) aparecem como "Em breve" mais abaixo, e só se
 * o usuário tiver o módulo liberado (senão nem faz sentido anunciar o que está por vir). */
const MODULOS_CONSTRUIDOS: ModuloBaseChave[] = ["atletas"];

function IconAtletas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

export default async function BasePage() {
  const supabase = createClient();
  const modulosPermitidos = await getModulosBasePermitidos(supabase);
  const temModulo = (chave: ModuloBaseChave) => modulosPermitidos.includes(chave);

  const { count: totalAtletasCount } = await supabase
    .from("atletas_base")
    .select("*", { count: "exact", head: true });
  const totalAtletas = totalAtletasCount ?? 0;

  const emBreve = MODULOS_BASE.filter(
    (m) => !MODULOS_CONSTRUIDOS.includes(m.chave) && temModulo(m.chave),
  );

  return (
    <AppShell departamento="futebol_base">
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Início
      </Link>
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <SproutIcon className="h-6 w-6" />
        </span>
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {temModulo("atletas") ? (
          <Link
            href="/base/atletas"
            className="card group relative flex flex-col gap-3 overflow-hidden p-6 pt-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
            <span className="absolute right-5 top-6 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-dourado">
              →
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IconAtletas className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-grena-escuro">Atletas</h2>
            <p className="text-sm font-medium text-neutral-500">
              {totalAtletas} cadastrado{totalAtletas === 1 ? "" : "s"}
            </p>
          </Link>
        ) : null}
      </div>

      {emBreve.length > 0 ? (
        <>
          <h2 className="mt-10 text-center text-lg font-semibold text-neutral-500">Em breve</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {emBreve.map((m) => (
              <div
                key={m.chave}
                className="card flex flex-col items-center gap-3 p-8 text-center opacity-60"
                aria-disabled
              >
                <span className="inline-block h-1 w-10 rounded bg-prata" />
                <h3 className="text-xl font-bold text-neutral-600">{m.label}</h3>
                <span className="w-fit rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600">
                  Em breve
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
