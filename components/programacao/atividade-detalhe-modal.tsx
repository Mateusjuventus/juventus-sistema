"use client";

import { useState } from "react";
import { ModalShell } from "./modal";
import { GameCard } from "./game-card";
import { NovaSubatividadeModal } from "./nova-subatividade-modal";
import { AtividadeFormModal } from "./nova-atividade-modal";
import { formatHorarioCurto, labelTipoAtividade } from "@/lib/programacao/tipo-atividade";
import type { AtividadeComDetalhes, JogoResumoAtividade } from "@/lib/programacao/queries";
import type { ProgramacaoCatalogoSubatividadeRow } from "@/lib/supabase/types";
import type { CategoriaBase } from "@/lib/auth/categorias-base";

function formatDataBr(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Detalhe de uma atividade da grade — abas Planejamento (lista de subatividades + "+ Nova
 * Subatividade") e Executado (ainda não tem nada pra registrar aqui — ver spec, "Fora de escopo").
 * Botão "Editar" adicionado em 18/09 (pedido do Mateus) abre o mesmo formulário de "+ Nova
 * Atividade" (`AtividadeFormModal`) já preenchido — ainda sem remoção de atividade/subatividade.
 */
export function AtividadeDetalheModal({
  atividade,
  catalogo,
  categoria,
  jogosParaSelecao,
  onClose,
}: {
  atividade: AtividadeComDetalhes;
  catalogo: ProgramacaoCatalogoSubatividadeRow[];
  categoria: CategoriaBase;
  jogosParaSelecao: JogoResumoAtividade[];
  onClose: () => void;
}) {
  const [aba, setAba] = useState<"planejamento" | "executado">("planejamento");
  const [novaSubAberta, setNovaSubAberta] = useState(false);
  const [editarAberto, setEditarAberto] = useState(false);

  const subtitulo = atividade.jogo
    ? undefined
    : `${labelTipoAtividade(atividade.tipo)} · ${formatDataBr(atividade.data)} · ${formatHorarioCurto(atividade.horario_inicio)}${
        atividade.horario_termino ? ` - ${formatHorarioCurto(atividade.horario_termino)}` : ""
      }${atividade.local ? ` · ${atividade.local}` : ""}`;

  return (
    <>
      <ModalShell titulo={atividade.nome} subtitulo={subtitulo} onClose={onClose} maxWidthClassName="max-w-xl">
        {atividade.jogo ? (
          <div className="mb-5">
            <GameCard jogo={atividade.jogo} tipo={atividade.tipo} />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 border-b border-linha">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setAba("planejamento")}
              className={`border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
                aba === "planejamento" ? "border-grena text-grena" : "border-transparent text-neutral-400 hover:text-grena"
              }`}
            >
              Planejamento
            </button>
            <button
              type="button"
              onClick={() => setAba("executado")}
              className={`border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
                aba === "executado" ? "border-grena text-grena" : "border-transparent text-neutral-400 hover:text-grena"
              }`}
            >
              Executado
            </button>
          </div>
          <button type="button" onClick={() => setEditarAberto(true)} className="mb-2 shrink-0 text-sm font-semibold text-grena hover:underline">
            Editar
          </button>
        </div>

        {aba === "planejamento" ? (
          <div className="pt-4">
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => setNovaSubAberta(true)} className="btn-primary">
                + Nova Subatividade
              </button>
            </div>
            {atividade.subatividades.length === 0 ? (
              <p className="rounded-md border border-linha px-4 py-6 text-center text-sm text-neutral-400">
                Nenhuma subatividade cadastrada ainda.
              </p>
            ) : (
              <div className="divide-y divide-linha rounded-md border border-linha">
                {atividade.subatividades.map((sub) => (
                  <div key={sub.id} className="px-4 py-2.5">
                    <p className="m-0 text-sm font-semibold text-neutral-800">{sub.nome}</p>
                    {sub.duracao_blocos || sub.intervalo_min ? (
                      <p className="m-0 mt-0.5 text-xs text-neutral-500">
                        {sub.duracao_blocos ? `${sub.duracao_blocos} bloco${sub.duracao_blocos > 1 ? "s" : ""}` : null}
                        {sub.duracao_blocos && sub.intervalo_min ? " · " : null}
                        {sub.intervalo_min ? `Intervalo de ${sub.intervalo_min} min` : null}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4">
            <p className="rounded-md border border-linha px-4 py-6 text-center text-sm text-neutral-400">
              Ainda não há registro do que foi executado nesta atividade.
            </p>
          </div>
        )}
      </ModalShell>

      {novaSubAberta ? (
        <NovaSubatividadeModal
          atividadeId={atividade.id}
          atividadeNome={atividade.nome}
          catalogo={catalogo}
          onClose={() => setNovaSubAberta(false)}
        />
      ) : null}

      {editarAberto ? (
        <AtividadeFormModal
          categoria={categoria}
          jogosParaSelecao={jogosParaSelecao}
          atividadeExistente={atividade}
          onClose={() => {
            setEditarAberto(false);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}
