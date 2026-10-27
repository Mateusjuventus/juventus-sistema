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
import { ROTULO_SEM_COMPETICAO, type CompeticaoDisponivelAtleta } from "@/lib/futebol/estatisticas-atleta-query";

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
 * checkbox (a seção inteira), também começando marcada. "Dados de Jogo" ganha um checklist de
 * Competições (agrupado por Temporada) pra filtrar — substituiu o filtro de período em 2026-10-27
 * (pedido do Mateus: "quero selecionar as competições que captam a participação dele e eu
 * seleciono. e não por período"); todas as Competições (e "sem competição", quando existir) começam
 * marcadas, igual ao resto do modal.
 */
export function FichaAtletaModal({
  pdfHrefBase,
  campos,
  competicoesDisponiveis,
  temJogosSemCompeticao,
  onClose,
}: {
  pdfHrefBase: string;
  campos: CampoFichaAtleta[];
  /** Competições formais disponíveis pro checklist de "Dados de Jogo" (ver
   * `buscarCompeticoesDisponiveisAtleta`) — já ordenadas por Temporada mais recente primeiro. */
  competicoesDisponiveis: CompeticaoDisponivelAtleta[];
  temJogosSemCompeticao: boolean;
  onClose: () => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(todosCamposFichaAtleta(campos));
  const [extras, setExtras] = useState<FichaAtletaExtras>(todosExtrasFichaAtleta());
  const [competicaoIdsSelecionados, setCompeticaoIdsSelecionados] = useState<Set<string>>(
    new Set(competicoesDisponiveis.map((c) => c.competicaoId)),
  );
  const [semCompeticaoSelecionado, setSemCompeticaoSelecionado] = useState(temJogosSemCompeticao);

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

  function alternarCompeticao(competicaoId: string) {
    setCompeticaoIdsSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(competicaoId)) novo.delete(competicaoId);
      else novo.add(competicaoId);
      return novo;
    });
  }

  function gerar() {
    const extraCampos = camposFichaAtletaParaQueryString(selecionados, campos);
    // Tudo marcado (todas as Competições + "sem competição", quando existir) == sem filtro algum —
    // mesma lógica de `camposFichaAtletaParaQueryString` (não muda o link de quem nunca desmarcou
    // nada no checklist).
    const tudoMarcado =
      competicaoIdsSelecionados.size >= competicoesDisponiveis.length &&
      (!temJogosSemCompeticao || semCompeticaoSelecionado);
    const extraSecoes = extrasFichaAtletaParaQueryString(extras, {
      competicaoIds: tudoMarcado ? undefined : [...competicaoIdsSelecionados],
      incluirSemCompeticao: tudoMarcado ? undefined : semCompeticaoSelecionado,
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
              <div className="ml-6">
                {competicoesDisponiveis.length === 0 && !temJogosSemCompeticao ? (
                  <p className="text-xs text-neutral-400">
                    Nenhum jogo com Convocação salva encontrado ainda — a lista de Competições aparece aqui
                    quando houver.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-neutral-500">
                      Competições que entram no gráfico e na lista jogo a jogo:
                    </p>
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const grupos: { temporadaId: string; temporadaNome: string; itens: CompeticaoDisponivelAtleta[] }[] = [];
                        for (const c of competicoesDisponiveis) {
                          const ultimo = grupos[grupos.length - 1];
                          if (ultimo && ultimo.temporadaId === c.temporadaId) ultimo.itens.push(c);
                          else grupos.push({ temporadaId: c.temporadaId, temporadaNome: c.temporadaNome, itens: [c] });
                        }
                        return grupos.map((grupo) => (
                          <div key={grupo.temporadaId}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                              {grupo.temporadaNome}
                            </p>
                            <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {grupo.itens.map((c) => (
                                <label key={c.competicaoId} className="flex items-center gap-2 text-sm text-neutral-700">
                                  <input
                                    type="checkbox"
                                    checked={competicaoIdsSelecionados.has(c.competicaoId)}
                                    onChange={() => alternarCompeticao(c.competicaoId)}
                                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                                  />
                                  {c.competicaoNome}
                                </label>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                      {temJogosSemCompeticao ? (
                        <label className="flex items-center gap-2 text-sm text-neutral-700">
                          <input
                            type="checkbox"
                            checked={semCompeticaoSelecionado}
                            onChange={() => setSemCompeticaoSelecionado((v) => !v)}
                            className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                          />
                          {ROTULO_SEM_COMPETICAO}
                        </label>
                      ) : null}
                    </div>
                  </>
                )}
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
