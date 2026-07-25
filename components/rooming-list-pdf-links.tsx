"use client";

import { useState } from "react";

const OPCOES_ORDEM = [
  { value: "", label: "Atletas: ordem de cadastro" },
  { value: "apto_asc", label: "Atletas: apto. menor → maior" },
  { value: "apto_desc", label: "Atletas: apto. maior → menor" },
];

/**
 * Botões de gerar PDF da Rooming List, com um seletor de ordenação dos quartos de Atletas pelo
 * número do apartamento (crescente/decrescente/ordem de cadastro) — aplicado como query string nos
 * dois links. A Comissão Técnica nunca é afetada por essa escolha: fica sempre na ordem livre em
 * que os quartos foram organizados (ver `ordenarQuartosPorApartamento` em `lib/pdf/logistica-shared.tsx`).
 */
export function RoomingListPdfLinks({ pdfHref, pdfEnvioHref }: { pdfHref: string; pdfEnvioHref: string }) {
  const [ordem, setOrdem] = useState("");
  const query = ordem ? `?ordemAtletas=${ordem}` : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={ordem}
        onChange={(e) => setOrdem(e.target.value)}
        aria-label="Ordenar quartos de Atletas por número do apartamento"
        className="field-input w-auto text-sm"
      >
        {OPCOES_ORDEM.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <a href={`${pdfHref}${query}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
        PDF completo (uso interno)
      </a>
      <a href={`${pdfEnvioHref}${query}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
        PDF para atletas/comissão
      </a>
    </div>
  );
}
