"use client";

import { useState } from "react";
import { ModalShell } from "@/components/programacao/modal";
import {
  SECOES_FICHA_ATLETA,
  camposFichaAtletaParaQueryString,
  todosCamposFichaAtleta,
  type CampoFichaAtleta,
} from "@/lib/futebol/ficha-atleta";

/**
 * Escolha de quais dados saem na ficha do atleta antes de gerar o PDF (pedido do Mateus em
 * 2026-10-22) — abre ao clicar em "Gerar ficha" (ver `GerarFichaAtletaButton`). Seleção campo a
 * campo (não por bloco inteiro, diferente de `ExportColunasModal`), mas os checkboxes ficam
 * agrupados nas mesmas 3 seções que aparecem no PDF (Dados Pessoais / Dados Esportivos / Dados do
 * Contrato). Todos os campos começam marcados — quem só quer a ficha completa clica direto em
 * "Gerar PDF".
 */
export function FichaAtletaModal({
  pdfHrefBase,
  campos,
  onClose,
}: {
  pdfHrefBase: string;
  campos: CampoFichaAtleta[];
  onClose: () => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(todosCamposFichaAtleta(campos));

  function alternar(chave: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function gerar() {
    const extra = camposFichaAtletaParaQueryString(selecionados, campos);
    const href = extra ? `${pdfHrefBase}${pdfHrefBase.includes("?") ? "&" : "?"}${extra}` : pdfHrefBase;
    window.open(href, "_blank");
    onClose();
  }

  return (
    <ModalShell
      titulo="Gerar ficha do atleta"
      subtitulo="Marque os dados que devem aparecer na ficha."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={gerar} className="btn-primary">
            Gerar PDF
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {SECOES_FICHA_ATLETA.map((secao) => {
          const camposDaSecao = campos.filter((c) => c.secao === secao.chave);
          if (camposDaSecao.length === 0) return null;
          return (
            <div key={secao.chave}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-grena-escuro">{secao.label}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {camposDaSecao.map((campo) => (
                  <label key={campo.chave} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selecionados.has(campo.chave)}
                      onChange={() => alternar(campo.chave)}
                      className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                    />
                    {campo.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
