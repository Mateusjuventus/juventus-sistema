"use client";

import { JuventusCrest } from "@/components/juventus-crest";

/**
 * Tela de erro amigável pros links públicos sem login (Ficha de Cadastro de Atleta, Inscrição de
 * Captação, Cadastro de Staff/Comissão Técnica — Profissional e Base — e Vagas). Sem isso, qualquer
 * erro inesperado nessas telas (conexão instável no celular, link aberto bem na hora de uma
 * atualização do sistema) caía na tela em branco genérica do Next.js ("Application error: a
 * client-side exception has occurred"), sem nenhum jeito de tentar de novo — quem preenche esses
 * formulários não tem login nem acesso ao resto do sistema pra "voltar" e recomeçar.
 *
 * O Next.js exige um arquivo `error.tsx` PRÓPRIO em cada rota (não dá pra compartilhar um único
 * `error.tsx` entre pastas) — por isso cada uma das 8 rotas públicas tem o seu, mas todos só chamam
 * este componente compartilhado, pra manter a mensagem e o visual consistentes.
 */
export function PublicFormError({
  reset,
  maxWidth = "max-w-2xl",
  crestClassName = "h-24 w-auto drop-shadow-lg",
  padding = "py-10",
}: {
  reset: () => void;
  maxWidth?: string;
  crestClassName?: string;
  padding?: string;
}) {
  return (
    <main className={`flex min-h-screen items-center justify-center bg-grena-escuro px-4 ${padding}`}>
      <div className={`mx-auto w-full ${maxWidth}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className={crestClassName} />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
        </div>

        <div className="card p-6 text-center sm:p-8">
          <p className="text-lg font-semibold text-grena-escuro">Não foi possível carregar a página</p>
          <p className="mt-2 text-sm text-neutral-500">
            Pode ter sido a conexão com a internet, ou uma instabilidade rápida do sistema. Verifique
            sua conexão e tente novamente — se continuar acontecendo, aguarde alguns minutos e tente
            de novo.
          </p>
          <button type="button" onClick={reset} className="btn-primary mt-6">
            Tentar novamente
          </button>
        </div>
      </div>
    </main>
  );
}
