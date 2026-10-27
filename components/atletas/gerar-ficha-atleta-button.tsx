"use client";

import { useState } from "react";
import { FichaAtletaModal } from "./ficha-atleta-modal";
import type { CampoFichaAtleta } from "@/lib/futebol/ficha-atleta";
import type { CompeticaoDisponivelAtleta } from "@/lib/futebol/estatisticas-atleta-query";

/** Botão "Gerar ficha" nas telas "Ver atleta" (Profissional e Base) — abre o modal de seleção de
 * campos (`FichaAtletaModal`). Client Component fino só pra guardar o estado de aberto/fechado do
 * modal; as páginas (Server Components) só passam `pdfHrefBase`, `campos` e — desde 2026-10-27 — as
 * Competições disponíveis pro checklist de "Dados de Jogo" (ver `buscarCompeticoesDisponiveisAtleta`
 * nas páginas "Ver atleta"). */
export function GerarFichaAtletaButton({
  pdfHrefBase,
  campos,
  competicoesDisponiveis,
  temJogosSemCompeticao,
}: {
  pdfHrefBase: string;
  campos: CampoFichaAtleta[];
  competicoesDisponiveis: CompeticaoDisponivelAtleta[];
  temJogosSemCompeticao: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        Gerar ficha
      </button>
      {aberto ? (
        <FichaAtletaModal
          pdfHrefBase={pdfHrefBase}
          campos={campos}
          competicoesDisponiveis={competicoesDisponiveis}
          temJogosSemCompeticao={temJogosSemCompeticao}
          onClose={() => setAberto(false)}
        />
      ) : null}
    </>
  );
}
