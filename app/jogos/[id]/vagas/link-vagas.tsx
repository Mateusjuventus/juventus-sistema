"use client";

import { useState } from "react";

/**
 * Caixa do link público. "Copiar" e "Enviar no WhatsApp" existem porque o link só tem valor quando
 * chega no grupo — e digitar um token hexadecimal à mão no celular seria a forma mais rápida de o
 * recurso não ser usado.
 *
 * A URL é montada no navegador (`window.location.origin`) em vez de vir do servidor: o sistema não
 * guarda o próprio endereço em lugar nenhum, e o domínio de onde a página está aberta é justamente
 * o endereço que funciona pra quem vai receber.
 */
export function LinkVagas({ token, mensagem }: { token: string; mensagem: string }) {
  const [copiado, setCopiado] = useState(false);
  const url = typeof window === "undefined" ? `/vagas/${token}` : `${window.location.origin}/vagas/${token}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência (acontece fora de HTTPS): o link está
      // visível na tela, então dá pra copiar na mão.
      setCopiado(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3">
      <code className="min-w-[200px] flex-1 overflow-x-auto rounded border border-linha bg-white px-2 py-1.5 text-xs text-grena-escuro">
        {url}
      </code>
      <button type="button" onClick={copiar} className="btn-secondary text-sm">
        {copiado ? "Copiado!" : "Copiar"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${mensagem}\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary text-sm"
      >
        Enviar no WhatsApp
      </a>
    </div>
  );
}
