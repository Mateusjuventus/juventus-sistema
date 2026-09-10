"use client";

import { useState } from "react";
import { ModalShell } from "@/components/programacao/modal";
import {
  GRUPOS_CAMPO_EXPORT_ATLETA,
  gruposCampoExportParaQueryString,
  todosGruposCampoExport,
} from "@/lib/futebol/export-colunas";

/**
 * Escolha de quais dados saem na planilha antes de exportar (ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md, item 6 do ajuste de 2026-09-10) — abre ao clicar em
 * "Exportar para Excel". Nome, CPF e Status sempre saem (mínimo pra identificar o atleta na
 * planilha); os outros campos ficam agrupados em 4 blocos que a pessoa liga/desliga. Todos os blocos
 * começam marcados — quem só quer a planilha completa de sempre clica direto em "Exportar".
 */
export function ExportColunasModal({ hrefBase, onClose }: { hrefBase: string; onClose: () => void }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(todosGruposCampoExport());

  function alternar(chave: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function exportar() {
    const extra = gruposCampoExportParaQueryString(selecionados);
    const href = extra ? `${hrefBase}${hrefBase.includes("?") ? "&" : "?"}${extra}` : hrefBase;
    window.location.href = href;
    onClose();
  }

  return (
    <ModalShell
      titulo="Exportar para Excel"
      subtitulo="Nome, CPF e Status sempre saem na planilha — escolha o que mais entra."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={exportar} className="btn-primary">
            Exportar
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {GRUPOS_CAMPO_EXPORT_ATLETA.map((grupo) => (
          <label key={grupo.chave} className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={selecionados.has(grupo.chave)}
              onChange={() => alternar(grupo.chave)}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            {grupo.label}
          </label>
        ))}
      </div>
    </ModalShell>
  );
}
