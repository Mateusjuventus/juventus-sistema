"use client";

import { useState } from "react";
import {
  CRITERIOS_DESEMPATE,
  CRITERIO_LABEL,
  normalizarCriterios,
  type CriterioDesempate,
} from "@/lib/futebol/competicao-desempate";

/**
 * Editor da lista ORDENADA de critérios de desempate (Art. 17 na Copa Paulista — mas cada
 * competição tem os seus, por isso é configurável). Envia um hidden input `criterios` por
 * critério, na ordem, mesmo padrão dos demais campos de lista do sistema.
 *
 * Usado tanto no formulário da competição (padrão) quanto na fase (que pode ter a própria ordem,
 * §1º do Art. 17: no play in/mata-mata valem só os critérios até a alínea "b").
 */
export function CriteriosDesempateField({
  valorInicial,
  herdado,
  compacto,
}: {
  valorInicial: string[] | null;
  /** Quando presente, o campo pode ficar vazio significando "herda estes critérios". */
  herdado?: CriterioDesempate[];
  compacto?: boolean;
}) {
  const podeHerdar = herdado !== undefined;
  const [criterios, setCriterios] = useState<CriterioDesempate[]>(
    valorInicial === null && podeHerdar ? [] : normalizarCriterios(valorInicial),
  );
  const [novo, setNovo] = useState<CriterioDesempate>("vitorias");

  const disponiveis = CRITERIOS_DESEMPATE.filter((c) => !criterios.includes(c.value));

  const mover = (indice: number, delta: number) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= criterios.length) return;
    const copia = [...criterios];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setCriterios(copia);
  };

  return (
    <div>
      {criterios.map((c) => (
        <input key={c} type="hidden" name="criterios" value={c} />
      ))}

      {criterios.length === 0 ? (
        <p className={`text-neutral-400 ${compacto ? "text-xs" : "text-sm"}`}>
          {podeHerdar
            ? `Herda da competição: ${(herdado ?? []).map((c) => CRITERIO_LABEL[c]).join(" → ")}`
            : "Nenhum critério — o padrão será aplicado."}
        </p>
      ) : (
        <ol className="space-y-1">
          {criterios.map((c, i) => (
            <li
              key={c}
              className={`flex items-center justify-between gap-2 rounded-md border border-linha bg-white px-2 py-1 ${compacto ? "text-xs" : "text-sm"}`}
            >
              <span className="text-neutral-700">
                <span className="mr-1.5 font-semibold text-neutral-400">{String.fromCharCode(97 + i)})</span>
                {CRITERIO_LABEL[c]}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-grena disabled:opacity-30"
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === criterios.length - 1}
                  className="rounded px-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-grena disabled:opacity-30"
                  title="Descer"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setCriterios(criterios.filter((x) => x !== c))}
                  className="rounded px-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-600"
                  title="Remover"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {disponiveis.length > 0
        ? (() => {
            // O `novo` guardado pode já ter entrado na lista — cai no primeiro disponível.
            const selecionado = disponiveis.some((c) => c.value === novo) ? novo : disponiveis[0].value;
            return (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={selecionado}
                  onChange={(e) => setNovo(e.target.value as CriterioDesempate)}
                  className={`field-input w-auto ${compacto ? "py-1 text-xs" : ""}`}
                >
                  {disponiveis.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCriterios([...criterios, selecionado])}
                  className={`btn-secondary ${compacto ? "px-2 py-1 text-xs" : ""}`}
                >
                  + Adicionar
                </button>
              </div>
            );
          })()
        : null}
    </div>
  );
}
