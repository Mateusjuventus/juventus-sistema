"use client";

import { useState } from "react";
import { FichaComissaoModal } from "./ficha-comissao-modal";
import type { CampoFichaComissao } from "@/lib/futebol/ficha-comissao";

/**
 * Botão "Gerar ficha" na tela "Ver" da Comissão Técnica/Diretoria — abre o modal de seleção de
 * campos (`FichaComissaoModal`). Client Component fino só pra guardar o estado de aberto/fechado,
 * mesmo padrão de `GerarFichaAtletaButton` (components/atletas/gerar-ficha-atleta-button.tsx).
 *
 * Revisão de 14/11/2026 (mesmo dia da Vigência PJ): antes era só um link direto pro PDF (a ficha
 * era sempre completa) — o Mateus pediu a mesma escolha de campos que o atleta já tem, então virou
 * um modal igual ao de lá.
 */
export function GerarFichaComissaoButton({
  pdfHrefBase,
  campos,
}: {
  pdfHrefBase: string;
  campos: CampoFichaComissao[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        Gerar ficha
      </button>
      {aberto ? (
        <FichaComissaoModal pdfHrefBase={pdfHrefBase} campos={campos} onClose={() => setAberto(false)} />
      ) : null}
    </>
  );
}
