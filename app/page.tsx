import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getDepartamentosPermitidos } from "@/lib/auth/role";

/**
 * Tela de escolha de departamento — primeira coisa que qualquer usuário vê depois do login. Com só
 * dois departamentos possíveis (e sem previsão de um terceiro), a estrutura em cards permanece
 * simples de propósito.
 *
 * O grená cobre a tela inteira, sem cabeçalho separado (ver `AppShell` com `nav="none"`) — mesma
 * cor de preenchimento grande da sidebar/login. O brasão gigante e apagado no canto, girado, é
 * textura de fundo. O tratamento tipográfico (título em caixa alta, peso 900, risquinho diagonal
 * antes do rótulo) foi inspirado nos informativos de viagem que o Mateus já monta pro
 * Departamento — mesmo "jeito de cartaz oficial do clube", só que sem o rosa do patrocinador (fora
 * da paleta do sistema): aqui o acento é o dourado, que já é o acento pontual do resto do produto.
 */
export default async function HomePage() {
  const supabase = createClient();
  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const temProfissional = departamentosPermitidos.includes("futebol_profissional");
  const temBase = departamentosPermitidos.includes("futebol_base");
  const temAmbos = temProfissional && temBase;

  return (
    <AppShell nav="none">
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 rotate-[18deg] opacity-[0.08] sm:-right-24 sm:-top-24"
        >
          <JuventusCrest className="h-[26rem] w-auto sm:h-[34rem]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 rotate-[18deg] opacity-[0.06] sm:-bottom-32 sm:-left-24"
        >
          <JuventusCrest className="h-[22rem] w-auto sm:h-[28rem]" />
        </div>
        {/* Risquinhos diagonais do canto — mesmo recurso gráfico da capa dos informativos de
            viagem do Departamento, só que em dourado em vez do rosa do patrocinador. */}
        <div aria-hidden className="pointer-events-none absolute left-0 top-8 flex flex-col gap-2 opacity-40">
          <span className="h-px w-24 -rotate-6 bg-dourado sm:w-40" />
          <span className="h-px w-16 -rotate-6 bg-dourado sm:w-28" />
        </div>

        {/* Espaçamento vertical bem mais justo que antes (era py-16/mt-16 com min-h-screen
            centralizando tudo — ficava "esticado" em telas altas). Cada elemento continua com seu
            próprio max-w (o grid de cards cresce pra max-w-3xl quando há dois departamentos), só
            que agora empilhados bem mais próximos uns dos outros. */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dourado/50 bg-white p-2 shadow-lg">
          <JuventusCrest className="h-full w-auto" />
        </div>
        <p className="relative mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-dourado">
          <span aria-hidden className="inline-block h-3.5 w-1.5 -skew-x-12 bg-dourado" />
          Sistema de gestão
        </p>
        <h1 className="relative mt-1.5 text-center text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Juventus - SAF
        </h1>
        <p className="relative mt-2 text-center text-sm text-white/70">Escolha um departamento para começar.</p>

        {temProfissional || temBase ? (
          <div
            className={`relative mt-6 grid w-full gap-4 ${temAmbos ? "max-w-3xl sm:grid-cols-2" : "max-w-xs"}`}
          >
            {temProfissional ? (
              <Link
                href="/profissional"
                className="card flex min-h-[100px] items-center justify-center p-5 text-center shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:ring-2 hover:ring-dourado"
              >
                <h2 className="text-xl font-black uppercase tracking-tight text-grena-escuro">
                  Futebol Profissional
                </h2>
              </Link>
            ) : null}

            {temBase ? (
              <Link
                href="/base"
                className="card flex min-h-[100px] items-center justify-center p-5 text-center shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:ring-2 hover:ring-dourado"
              >
                <h2 className="text-xl font-black uppercase tracking-tight text-grena-escuro">
                  Futebol de Base
                </h2>
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="card relative mt-6 max-w-md p-6 text-center text-sm text-neutral-500 shadow-xl">
            Nenhum departamento liberado pro seu usuário ainda. Fale com quem administra o sistema.
          </p>
        )}

        <p className="relative mt-8 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Clube Atlético Juventus SAF
        </p>
      </div>
    </AppShell>
  );
}
