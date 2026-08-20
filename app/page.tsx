import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getDepartamentosPermitidos } from "@/lib/auth/role";

/**
 * Tela de escolha de departamento — primeira coisa que qualquer usuário vê depois do login. Com
 * só dois departamentos possíveis (e sem previsão de um terceiro), a estrutura em cards permanece
 * simples de propósito; o cuidado aqui foi tirar a repetição do brasão (aparecia 3x idêntico: no
 * cabeçalho do AppShell, no hero e dentro de cada card) e dar a cada card uma descrição real do que
 * tem lá dentro, em vez de só um crest redundante + "Entrar". O "Entrar" virou um botão de verdade
 * (pill com borda, preenche no hover) em vez de só um link de texto, e o rodapé fixa a marca do
 * clube no fim da página — pequenos toques que fazem a tela de abertura parecer produto acabado,
 * não uma lista de atalhos.
 */
export default async function HomePage() {
  const supabase = createClient();
  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const temProfissional = departamentosPermitidos.includes("futebol_profissional");
  const temBase = departamentosPermitidos.includes("futebol_base");
  const temAmbos = temProfissional && temBase;

  return (
    <AppShell nav="none">
      <div className="flex min-h-[75vh] flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
          <div className="relative">
            <div aria-hidden className="absolute inset-0 -z-10 rounded-full bg-dourado/15 blur-2xl" />
            <div className="rounded-full border border-dourado/40 bg-white p-3 shadow-md">
              <JuventusCrest className="h-16 w-auto sm:h-20" />
            </div>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-dourado">
            Sistema de gestão
          </p>
          <h1 className="mt-1 text-center text-3xl font-bold tracking-tight text-grena-escuro sm:text-4xl">
            Juventus - SAF
          </h1>
          <p className="mt-2 text-center text-neutral-500">Escolha um departamento para começar.</p>

          {temProfissional || temBase ? (
            <div className={`mt-10 grid w-full gap-5 ${temAmbos ? "max-w-3xl sm:grid-cols-2" : "max-w-sm"}`}>
              {temProfissional ? (
                <Link
                  href="/profissional"
                  className="card group relative overflow-hidden p-7 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-dourado"
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-grena" />
                  <h2 className="text-xl font-bold text-grena-escuro">Futebol Profissional</h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    Elenco, jogos, financeiro, estoque e logística.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-grena/30 px-4 py-1.5 text-sm font-semibold text-grena transition-colors group-hover:border-grena group-hover:bg-grena group-hover:text-white">
                    Entrar
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </Link>
              ) : null}

              {temBase ? (
                <Link
                  href="/base"
                  className="card group relative overflow-hidden p-7 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-dourado"
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-grena" />
                  <h2 className="text-xl font-bold text-grena-escuro">Futebol de Base</h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    Atletas, captação/avaliação e categorias de base.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-grena/30 px-4 py-1.5 text-sm font-semibold text-grena transition-colors group-hover:border-grena group-hover:bg-grena group-hover:text-white">
                    Entrar
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
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

        <p className="pb-2 pt-10 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Clube Atlético Juventus SAF
        </p>
      </div>
    </AppShell>
  );
}
