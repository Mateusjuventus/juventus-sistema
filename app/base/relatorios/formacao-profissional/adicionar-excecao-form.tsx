"use client";

import { useState } from "react";
import { criarExcecao } from "./actions";

export interface AtletaCandidato {
  id: string;
  nome: string;
}

/** Busca por nome + botão "Incluir" por linha — mesmo padrão de busca/filtro do `ListaSelecao` do
 * Relatório Avulso (`app/base/relatorios/avulso/relatorio-avulso-form-base.tsx`, uma função local
 * ali, não um componente compartilhado), mas aqui cada linha já submete a exceção 'incluir' na hora
 * (não é uma seleção de formulário com botão único no fim). */
export function AdicionarExcecaoForm({ atletas }: { atletas: AtletaCandidato[] }) {
  const [busca, setBusca] = useState("");
  const filtrados = busca.trim() ? atletas.filter((a) => a.nome.toLowerCase().includes(busca.trim().toLowerCase())) : atletas;

  return (
    <div className="card space-y-2 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">Adicionar atleta fora do padrão</h3>
      {atletas.length === 0 ? (
        <p className="text-sm text-neutral-400">Todo mundo que poderia entrar já está na relação.</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="field-input"
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-100">
            {filtrados.length === 0 ? (
              <p className="p-3 text-sm text-neutral-400">Nada encontrado.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filtrados.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="text-neutral-800">{a.nome}</span>
                    <form action={criarExcecao}>
                      <input type="hidden" name="atletaId" value={a.id} />
                      <input type="hidden" name="tipo" value="incluir" />
                      <button type="submit" className="text-xs font-medium text-grena hover:underline">
                        Incluir
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
