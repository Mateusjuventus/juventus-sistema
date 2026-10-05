import { Suspense } from "react";
import { ProxisLogo, ProxisMark } from "@/components/proxis-brand";
import { LoginForm } from "./login-form";

/**
 * Login é a porta de entrada do SOFTWARE (Proxis), antes de escolher o Juventus — por isso a
 * identidade visual aqui é a da PRÓPRIA Proxis (fundo `proxisNavy`, acentos e botão em
 * `proxisAzul` — ver `lib/theme-proxis.ts`), não o grená/dourado do clube (ver
 * docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md — pedido explícito do Mateus em
 * 05/10). A partir da tela de escolha de departamento pra dentro, a identidade volta a ser do
 * Juventus. A logo já traz o nome por extenso, então não repetimos "Proxis — Gestão Esportiva" em
 * texto embaixo dela.
 *
 * A marca d'água do ícone girado nos cantos e o risquinho diagonal do eyebrow reaproveitam o mesmo
 * recurso gráfico da tela de escolha de departamento (`app/page.tsx`) — só que com o ícone e a cor
 * da Proxis em vez do Juventus, já que aqui é a Proxis quem é a identidade principal.
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-proxisNavy px-4">
      {/* Textura de fundo — mesmo recurso do brasão d'água gigante e girado da tela de escolha de
          departamento, aqui com o ícone da própria Proxis. */}
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 rotate-[18deg] opacity-[0.05]">
        <ProxisMark className="h-96 w-auto" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-28 rotate-[18deg] opacity-[0.04]">
        <ProxisMark className="h-80 w-auto" />
      </div>

      {/* Glow suave atrás da logo, na própria cor de acento da Proxis — só pra dar profundidade ao
          fundo chapado, nada que compita com o card ou a logo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-28 h-72 w-72 -translate-x-1/2 rounded-full bg-proxisAzul/20 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* A logo é escrita em navy escuro (pensada pra fundo claro) — num fundo tão escuro
              quanto `proxisNavy`, o nome "PROXIS" quase some. A placa branca por trás resolve isso
              sem precisar clarear o fundo da tela inteira. */}
          <div className="rounded-2xl bg-white px-8 py-5 shadow-xl shadow-black/30 ring-1 ring-white/10">
            <ProxisLogo className="h-14 w-auto" />
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-proxisAzul">
            <span aria-hidden className="inline-block h-3.5 w-1.5 -skew-x-12 bg-proxisAzul" />
            Operando para Clube Atlético Juventus
          </p>
        </div>

        {/* Faixa de acento no topo do card — mesma cor do botão, amarra o card branco de volta à
            identidade da Proxis em vez de deixá-lo genérico. */}
        <div className="overflow-hidden rounded-lg border border-linha shadow-sm">
          <div className="h-1.5 bg-proxisAzul" />
          <div className="bg-white p-8">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
