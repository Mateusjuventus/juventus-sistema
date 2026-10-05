"use client";

import { useState } from "react";
import { PessoaAcompanhadaCard } from "./pessoa-acompanhada-card";
import { PessoaDemandasModal } from "./pessoa-demandas-modal";
import type { RendimentoDemandas } from "@/lib/demandas/rendimento";
import type { DemandaRow } from "@/lib/supabase/types";

export interface PessoaAcompanhadaItem {
  id: string;
  nome: string;
  funcao: string;
  fotoUrl: string | null;
  rendimento: RendimentoDemandas;
  pendencias: DemandaRow[];
}

/**
 * Grade de cards do Painel de Demandas (`/demandas`) + o controle de qual pessoa está com a tela
 * intermediária aberta — mesmo padrão de `FisioterapiaListagem` (um estado `selecionado` na
 * listagem, o modal só aparece quando ele está preenchido).
 */
export function DemandasListagem({ cards, hojeStr }: { cards: PessoaAcompanhadaItem[]; hojeStr: string }) {
  const [selecionado, setSelecionado] = useState<PessoaAcompanhadaItem | null>(null);

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <PessoaAcompanhadaCard
            key={c.id}
            nome={c.nome}
            funcao={c.funcao}
            fotoUrl={c.fotoUrl}
            rendimento={c.rendimento}
            pendencias={c.pendencias}
            hojeStr={hojeStr}
            aoClicar={() => setSelecionado(c)}
          />
        ))}
      </div>

      {selecionado ? (
        <PessoaDemandasModal
          perfilId={selecionado.id}
          nome={selecionado.nome}
          funcao={selecionado.funcao}
          fotoUrl={selecionado.fotoUrl}
          onClose={() => setSelecionado(null)}
        />
      ) : null}
    </>
  );
}
