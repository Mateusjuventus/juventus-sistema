"use client";

import { useState, useTransition } from "react";
import { salvarMicrocicloTexto } from "@/lib/programacao/actions";
import type { CategoriaBase } from "@/lib/auth/categorias-base";

/**
 * Campo "Descrição do microciclo" (ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-
 * layout-geral-design.md, Parte 2) — substitui o número fixo "Microciclo Nº X" na exportação por
 * texto livre, editável direto na grade em tela. Salva no blur ou no clique de "Salvar", chamando
 * `salvarMicrocicloTexto` via `useTransition` (mesmo padrão de `copiar-dia-modal.tsx`).
 *
 * O componente que usa este aqui (`ProgramacaoView`) precisa passar `key={categoriaAtiva}` —
 * `valorInicial` só é lido na montagem, então sem a key o campo continuaria mostrando o texto da
 * categoria anterior ao trocar de categoria pelos pills (a troca é só uma navegação de `Link`, não
 * remonta este componente sozinha).
 */
export function MicrocicloTextoEditor({
  categoria,
  valorInicial,
}: {
  categoria: CategoriaBase;
  valorInicial: string | null;
}) {
  const [valor, setValor] = useState(valorInicial ?? "");
  const [valorSalvo, setValorSalvo] = useState(valorInicial ?? "");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    if (valor === valorSalvo) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await salvarMicrocicloTexto(categoria, valor);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      setValorSalvo(valor);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="microciclo-texto" className="text-xs font-medium text-neutral-500">
        Descrição do microciclo (opcional)
      </label>
      <input
        id="microciclo-texto"
        type="text"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        placeholder="Ex.: Microciclo Nº 21"
        className="field-input max-w-xs py-1 text-sm"
      />
      <button
        type="button"
        onClick={salvar}
        disabled={pending || valor === valorSalvo}
        className="rounded-md border border-linha bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
      {erro ? <span className="text-xs text-red-700">{erro}</span> : null}
    </div>
  );
}
