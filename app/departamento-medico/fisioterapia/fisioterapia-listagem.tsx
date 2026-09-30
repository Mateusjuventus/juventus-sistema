"use client";

import { useMemo, useState } from "react";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import type { FisioterapiaAtletaItem } from "./page";

/** Cor do indicador "em tratamento" (lesão ativa agora) — só uma cor, sem níveis (diferente da
 * classificação G1/G2/G3 da Base). Vermelho por ser o mais claramente associado a "atenção médica",
 * sem colidir com as cores já usadas em outras bordas do sistema. */
const BORDA_EM_TRATAMENTO = "border-red-500";

/** Grade de cards + busca por nome da listagem de Fisioterapia — mesmo padrão de busca client-side
 * já usado em `app/treinador/atletas/treinador-atletas-view.tsx`. */
export function FisioterapiaListagem({ atletas }: { atletas: FisioterapiaAtletaItem[] }) {
  const [busca, setBusca] = useState("");
  const buscaNormalizada = busca.trim().toLowerCase();

  const atletasFiltrados = useMemo(
    () =>
      buscaNormalizada
        ? atletas.filter((a) => nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada))
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
          {atletas.length === 0 ? "Nenhum atleta ativo cadastrado no Profissional ainda." : "Nenhum atleta encontrado com esse nome."}
        </p>
      ) : (
        // Mesma grade compacta já usada na listagem principal de Atletas
        // (`components/atletas/atletas-resumo-filtros.tsx`) — cards menores, preenchendo a linha
        // conforme cabe, em vez da grade de 2-a-6 colunas fixas que deixava cada card grande
        // demais (pedido do Mateus em 2026-09-30).
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
          {atletasFiltrados.map((atleta) => (
            <AtletaCard
              key={atleta.id}
              atleta={atleta}
              href={atleta.href}
              mostrarCpf={false}
              mostrarContrato={false}
              corBordaExtra={atleta.emTratamento ? BORDA_EM_TRATAMENTO : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
