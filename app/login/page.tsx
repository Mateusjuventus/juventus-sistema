import { Suspense } from "react";
import { ProxisLockupClaro, ProxisMarkClaro } from "@/components/proxis-brand";
import { LoginForm } from "./login-form";

/**
 * Login é a porta de entrada do SOFTWARE (Proxis), antes de escolher o Juventus — por isso a
 * identidade visual aqui é a da PRÓPRIA Proxis (fundo `proxisNavy`, acentos e botão em
 * `proxisAzul` — ver `lib/theme-proxis.ts`), não o grená/dourado do clube (ver
 * docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md — pedido explícito do Mateus em
 * 05/10). A partir da tela de escolha de departamento pra dentro, a identidade volta a ser do
 * Juventus.
 *
 * `ProxisLockupClaro` (texto branco de verdade, não a imagem `proxis-logo.png`) no lugar da logo
 * original + placa branca de antes — pedido do Mateus em 05/10 ("não precisa desse quadro, pode
 * por a letra branca e aumentar a logo"). O risquinho diagonal do eyebrow reaproveita o mesmo
 * recurso gráfico da tela de escolha de departamento (`app/page.tsx`). O fundo usa um degradê (em
 * vez de `proxisNavy` chapado) com uma marca d'água grande do ícone — pedido do Mateus em 05/10 pra
 * não ficar "um azul sem graça".
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B2A4D] via-proxisNavy to-[#040B14] px-4">
      {/* Marca d'água grande do ícone da Proxis, sangrando pra fora da tela — o elemento que dá
          "textura" ao fundo (pedido do Mateus: o degradê sozinho ainda ficava liso demais).
          Opacidade bem mais alta que a do brasão d'água do Juventus nas outras telas porque aqui
          é só ela competindo com o card, não com um monte de outro conteúdo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 rotate-[-12deg] opacity-[0.09]"
      >
        <ProxisMarkClaro className="h-[44rem] w-auto" />
      </div>

      {/* Glow suave atrás da logo, na própria cor de acento da Proxis — dá profundidade extra sem
          competir com o card ou a logo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-28 h-72 w-72 -translate-x-1/2 rounded-full bg-proxisAzul/25 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <ProxisLockupClaro className="drop-shadow-lg" />
          <p className="mt-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-proxisAzul">
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
