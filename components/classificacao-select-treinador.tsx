"use client";

import { ATLETA_CLASSIFICACAO_OPTIONS } from "@/lib/futebol/classificacao-atleta";

/**
 * Seletor rápido de Classificação (G1/G2/G3) na área do Treinador (`app/treinador/page.tsx`, seção
 * "Meus atletas") — salva na hora ao trocar, sem precisar abrir outra tela (ver docs/superpowers/
 * specs/2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 1). O treinador não tem
 * acesso ao cadastro completo do atleta, só a este campo.
 */
export function ClassificacaoSelectTreinador({
  atletaId,
  defaultValue,
  action,
  className = "w-36",
}: {
  atletaId: string;
  defaultValue: string | null;
  action: (formData: FormData) => Promise<void>;
  className?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <select
        name="classificacao"
        defaultValue={defaultValue ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`${className} rounded-md border border-linha px-2 py-1.5 text-xs shadow-sm focus:border-grena focus:outline-none focus:ring-1 focus:ring-grena`}
      >
        <option value="">Não classificado</option>
        {ATLETA_CLASSIFICACAO_OPTIONS.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </form>
  );
}
