"use client";

import { useMemo, useState } from "react";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import type { AssistenciaSocialAtletaItem } from "./page";

/**
 * Grade de cards + busca por nome — mesmo padrão de busca client-side já usado em
 * `fisioterapia-listagem.tsx`. Diferente da Fisioterapia, aqui o clique navega direto pra ficha
 * (`href` do próprio `AtletaCard`, `as="link"` padrão) — não há modal intermediário, porque não
 * existe aqui um resumo rápido equivalente ao "Histórico de Status" que justifique um.
 */
export function AssistenciaSocialListagem({ atletas }: { atletas: AssistenciaSocialAtletaItem[] }) {
  const [busca, setBusca] = useState("");
  const buscaNormalizada = busca.trim().toLowerCase();

  const atletasFiltrados = useMemo(
    () =>
      buscaNormalizada
        ? atletas.filter((a) =>
            nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada),
          )
        : atletas,
    [atletas, buscaNormalizada],
  );

  return (
    <div>
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar atleta pelo nome..."
        className="field-input max-w-sm"
      />

      {atletasFiltrados.length === 0 ? (
        <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {atletas.length === 0 ? "Nenhum atleta ativo cadastrado na Base ainda." : "Nenhum atleta encontrado com esse nome."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
          {atletasFiltrados.map((atleta) => (
            <AtletaCard key={atleta.id} atleta={atleta} href={atleta.href} mostrarCpf={false} mostrarContrato={false} />
          ))}
        </div>
      )}
    </div>
  );
}
