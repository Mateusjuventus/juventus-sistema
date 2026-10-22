"use client";

import { useState } from "react";
import { FichaAtletaModal } from "./ficha-atleta-modal";
import type { CampoFichaAtleta } from "@/lib/futebol/ficha-atleta";

/** Botão "Gerar ficha" nas telas "Ver atleta" (Profissional e Base) — abre o modal de seleção de
 * campos (`FichaAtletaModal`). Client Component fino só pra guardar o estado de aberto/fechado do
 * modal; as páginas (Server Components) só passam `pdfHrefBase` e `campos`. */
export function GerarFichaAtletaButton({
  pdfHrefBase,
  campos,
}: {
  pdfHrefBase: string;
  campos: CampoFichaAtleta[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        Gerar ficha
      </button>
      {aberto ? <FichaAtletaModal pdfHrefBase={pdfHrefBase} campos={campos} onClose={() => setAberto(false)} /> : null}
    </>
  );
}
