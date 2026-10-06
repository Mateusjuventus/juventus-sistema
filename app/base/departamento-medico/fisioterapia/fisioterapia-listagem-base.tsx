"use client";

import { useMemo, useState } from "react";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { CategoriaBase } from "@/lib/supabase/types";
import { HistoricoStatusModalBase } from "./historico-status-modal-base";
import type { FisioterapiaAtletaItemBase } from "./page";

/** Mesma cor do indicador "em tratamento" do Profissional (ver `fisioterapia-listagem.tsx`). */
const BORDA_EM_TRATAMENTO = "border-red-500";

/**
 * Grade de cards + busca por nome + filtro de categoria da listagem de Fisioterapia (Base) —
 * espelha `fisioterapia-listagem.tsx` (Profissional), com o campo de categoria adicional ao lado
 * da busca (pedido do Mateus, ver docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md).
 * Os dois filtros são instantâneos no cliente, sobre a lista que o servidor já restringiu às
 * categorias permitidas — igual ao padrão de busca já usado nesta tela, sem recarregar a página.
 */
export function FisioterapiaListagemBase({
  atletas,
  podeEditar,
  categoriasPermitidas,
}: {
  atletas: FisioterapiaAtletaItemBase[];
  podeEditar: boolean;
  categoriasPermitidas: CategoriaBase[];
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const buscaNormalizada = busca.trim().toLowerCase();
  const [selecionado, setSelecionado] = useState<FisioterapiaAtletaItemBase | null>(null);

  const atletasFiltrados = useMemo(
    () =>
      atletas.filter((a) => {
        const combinaCategoria = !categoria || a.categoria === categoria;
        const combinaBusca =
          !buscaNormalizada ||
          nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada);
        return combinaCategoria && combinaBusca;
      }),
    [atletas, buscaNormalizada, categoria],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar atleta pelo nome..."
          className="field-input max-w-sm"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="field-input w-auto"
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS_BASE.filter((cat) => categoriasPermitidas.includes(cat.value)).map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {atletasFiltrados.length === 0 ? (
        <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {atletas.length === 0
            ? "Nenhum atleta ativo cadastrado na Base ainda."
            : "Nenhum atleta encontrado com esse filtro."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
          {atletasFiltrados.map((atleta) => (
            <div key={atleta.id} onClick={(e) => { e.preventDefault(); setSelecionado(atleta); }}>
              <AtletaCard
                atleta={atleta}
                href={atleta.href}
                mostrarCpf={false}
                mostrarContrato={false}
                corBordaExtra={atleta.emTratamento ? BORDA_EM_TRATAMENTO : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {selecionado ? (
        <HistoricoStatusModalBase
          atletaId={selecionado.id}
          nome={nomeExibido({ apelido: selecionado.apelido, nome_completo: selecionado.nome })}
          podeEditar={podeEditar}
          onClose={() => setSelecionado(null)}
        />
      ) : null}
    </div>
  );
}
