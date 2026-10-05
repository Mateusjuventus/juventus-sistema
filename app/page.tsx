import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { ProxisMark } from "@/components/proxis-brand";
import { createClient } from "@/lib/supabase/server";
import { getDepartamentosPermitidos } from "@/lib/auth/role";

/**
 * Primeira parada depois do login — hoje só decide pra onde mandar, nunca é uma tela de verdade pra
 * quem tem algum departamento liberado. Quem tem o Futebol Profissional entra direto nele (mesmo
 * tendo também o Futebol de Base liberado); só quem tem SÓ o Futebol de Base vai pra lá; quem não
 * tem nenhum departamento é quem efetivamente vê esta tela, como aviso.
 *
 * Antes havia uma tela de escolha de verdade (dois cards, um por departamento) pra quem tinha os
 * dois liberados — removida a pedido do Mateus em 05/10 ("continua aparecendo essa tela, eu não
 * quero mais ela"): quem tem os dois departamentos (hoje, principalmente ele mesmo) entra direto no
 * Profissional — é o departamento dele — e troca pro Base pelo atalho "Trocar" da sidebar
 * (`components/app-sidebar.tsx`, prop `outroDepartamento`) em vez de passar por aqui toda vez.
 *
 * O visual (grená cheio, sem cabeçalho separado — ver `AppShell` com `nav="none"` — brasão apagado
 * de fundo, assinatura da Proxis no canto, ver
 * docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md) continua o mesmo "jeito de cartaz
 * oficial do clube" de antes, só que agora só serve pro aviso de "nenhum departamento liberado".
 */
export default async function HomePage() {
  const supabase = createClient();
  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const temProfissional = departamentosPermitidos.includes("futebol_profissional");
  const temBase = departamentosPermitidos.includes("futebol_base");

  if (temProfissional) redirect("/profissional");
  if (temBase) redirect("/base");

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

        <p className="card relative mt-6 max-w-md p-6 text-center text-sm text-neutral-500 shadow-xl">
          Nenhum departamento liberado pro seu usuário ainda. Fale com quem administra o sistema.
        </p>

        <p className="relative mt-8 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Clube Atlético Juventus SAF
        </p>

        {/* Assinatura discreta da Proxis (software por trás do sistema) — canto inferior direito,
            fora do fluxo de leitura principal da tela. Mesmo espírito do rodapé dos PDFs
            (`lib/pdf/logistica-shared.tsx`): marca pequena, não concorre com o Juventus. */}
        <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 opacity-60 sm:bottom-6 sm:right-6">
          <ProxisMark className="h-4 w-4" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-white">Proxis Gestão Esportiva</span>
        </div>
      </div>
    </AppShell>
  );
}
