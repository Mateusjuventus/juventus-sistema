"use client";

import { useState } from "react";
import { ModalShell } from "@/components/programacao/modal";
import {
  SECOES_FICHA_COMISSAO,
  camposFichaComissaoParaQueryString,
  todosCamposFichaComissao,
  type CampoFichaComissao,
} from "@/lib/futebol/ficha-comissao";

/**
 * Escolha de quais dados saem na ficha da Comissão Técnica/Diretoria antes de gerar o PDF — pedido
 * do Mateus em 14/11/2026 (mesmo dia da Vigência PJ): "antes de gerar, precisa aparecer quais
 * dados eu quero que apareça". Abre ao clicar em "Gerar ficha" (ver `GerarFichaComissaoButton`).
 *
 * Mesmo padrão de `FichaAtletaModal` (components/atletas/ficha-atleta-modal.tsx) — seleção campo a
 * campo, agrupada nas seções que aparecem no PDF — mas bem mais simples: sem as seções "ricas"
 * (Dados de Jogo/Anotações/Competições), que só existem pro atleta. Todos os campos começam
 * marcados, igual lá — quem só quer a ficha completa clica direto em "Gerar PDF".
 */
export function FichaComissaoModal({
  pdfHrefBase,
  campos,
  onClose,
}: {
  pdfHrefBase: string;
  campos: CampoFichaComissao[];
  onClose: () => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(todosCamposFichaComissao(campos));

  function alternar(chave: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function gerar() {
    const extra = camposFichaComissaoParaQueryString(selecionados, campos);
    const href = extra ? `${pdfHrefBase}${pdfHrefBase.includes("?") ? "&" : "?"}${extra}` : pdfHrefBase;
    window.open(href, "_blank");
    onClose();
  }

  return (
    <ModalShell
      titulo="Gerar ficha"
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
        {SECOES_FICHA_COMISSAO.map((secao) => {
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
