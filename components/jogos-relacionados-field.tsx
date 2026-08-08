"use client";

import { useState } from "react";
import type { JogoRow } from "@/lib/supabase/types";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Seletor múltiplo opcional de jogos relacionados a uma despesa avulsa — usado quando um gasto é
 * compartilhado entre jogos (ex: um ônibus que serve 2 jogos fora). É só uma etiqueta/referência:
 * não entra no resumo previsto/efetuado de nenhum jogo (ver
 * docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md). Mesmo padrão de checkboxes +
 * hidden inputs já usado para a Comissão Técnica em app/jogos/[id]/convocacao/convocacao-form.tsx —
 * cada jogo marcado vira um input `jogo_<id>`, lido no servidor a partir das chaves do FormData.
 */
export function JogosRelacionadosField({
  jogos,
  jogosSelecionados = [],
}: {
  jogos: JogoRow[];
  jogosSelecionados?: string[];
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(jogosSelecionados));

  return (
    <div>
      <label className="field-label">Jogos relacionados (opcional)</label>
      <p className="mb-2 text-xs text-neutral-500">
        Marque se essa despesa tem a ver com um ou mais jogos específicos — é só uma referência, não
        afeta o resumo financeiro de nenhum jogo.
      </p>
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-linha p-3">
        {jogos.map((j) => (
          <label key={j.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selecionados.has(j.id)}
              onChange={() =>
                setSelecionados((atual) => {
                  const proximo = new Set(atual);
                  if (proximo.has(j.id)) proximo.delete(j.id);
                  else proximo.add(j.id);
                  return proximo;
                })
              }
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <span>
              {j.mandante ? "Juventus" : j.adversario_nome} x {j.mandante ? j.adversario_nome : "Juventus"}{" "}
              <span className="text-neutral-400">— {formatData(j.data_jogo)}</span>
            </span>
          </label>
        ))}
        {jogos.length === 0 ? <p className="text-sm text-neutral-400">Nenhum jogo cadastrado ainda.</p> : null}
      </div>
      {Array.from(selecionados).map((id) => (
        <input key={id} type="hidden" name={`jogo_${id}`} value="on" />
      ))}
    </div>
  );
}
