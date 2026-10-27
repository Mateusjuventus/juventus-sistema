"use client";

import { useState } from "react";
import { ModalShell } from "@/components/programacao/modal";
import {
  SECOES_FICHA_ATLETA,
  camposFichaAtletaParaQueryString,
  extrasFichaAtletaParaQueryString,
  todosCamposFichaAtleta,
  todosExtrasFichaAtleta,
  type CampoFichaAtleta,
  type FichaAtletaExtras,
} from "@/lib/futebol/ficha-atleta";

/**
 * Escolha de quais dados saem na ficha do atleta antes de gerar o PDF (pedido do Mateus em
 * 2026-10-22) — abre ao clicar em "Gerar ficha" (ver `GerarFichaAtletaButton`). Seleção campo a
 * campo (não por bloco inteiro, diferente de `ExportColunasModal`), mas os checkboxes ficam
 * agrupados nas mesmas 3 seções que aparecem no PDF (Dados Pessoais / Dados Esportivos / Dados do
 * Contrato). Todos os campos começam marcados — quem só quer a ficha completa clica direto em
 * "Gerar PDF".
 *
 * As duas seções novas da Ficha mestre (Dados de Jogo, Anotações — ver docs/superpowers/specs/
 * 2026-10-27-ficha-atleta-dossie-anotacoes-design.md) não são campo a campo: cada uma é um único
 * checkbox (a seção inteira), também começando marcada. "Dados de Jogo" ganha um filtro de período
 * opcional, só visível quando ela estiver marcada — mesmo "de"/"até" já usado na aba Dados de Jogo
 * (vazio = histórico completo).
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
  const [extras, setExtras] = useState<FichaAtletaExtras>(todosExtrasFichaAtleta());
  const [periodoDe, setPeriodoDe] = useState("");
  const [periodoAte, setPeriodoAte] = useState("");

  function alternar(chave: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function alternarExtra(chave: keyof FichaAtletaExtras) {
    setExtras((atual) => ({ ...atual, [chave]: !atual[chave] }));
  }

  function gerar() {
    const extraCampos = camposFichaAtletaParaQueryString(selecionados, campos);
    const extraSecoes = extrasFichaAtletaParaQueryString(extras, {
      de: periodoDe || undefined,
      ate: periodoAte || undefined,
    });
    const extra = [extraCampos, extraSecoes].filter(Boolean).join("&");
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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-grena-escuro">Outras seções</p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={extras.dadosDeJogo}
                onChange={() => alternarExtra("dadosDeJogo")}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              Dados de Jogo (participação, gols, cartões — com gráfico)
            </label>
            {extras.dadosDeJogo ? (
              <div className="ml-6 flex flex-wrap items-end gap-3">
                <div>
                  <label className="field-label">De</label>
                  <input
                    type="date"
                    value={periodoDe}
                    onChange={(e) => setPeriodoDe(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Até</label>
                  <input
                    type="date"
                    value={periodoAte}
                    onChange={(e) => setPeriodoAte(e.target.value)}
                    className="field-input"
                  />
                </div>
                <p className="text-xs text-neutral-400">Vazio = histórico completo</p>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={extras.anotacoes}
                onChange={() => alternarExtra("anotacoes")}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              Anotações (histórico com autor e data)
            </label>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
