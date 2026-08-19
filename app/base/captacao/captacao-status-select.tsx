"use client";

import { CAPTACAO_STATUS_COR, CAPTACAO_STATUS_OPTIONS } from "@/lib/futebol/captacao";
import type { CaptacaoStatus } from "@/lib/supabase/types";

/**
 * Seletor de status embutido na lista/tela do candidato — troca de status com um clique, sem abrir
 * um formulário separado. Mesmo padrão do `SolicitacaoStatusSelect`
 * (components/solicitacao-status.tsx), que o Mateus pediu pra replicar aqui ("igual vc faz hoje na
 * solicitações"). Só os 4 status "decididos" aparecem como opção — "Inscrição enviada" só sai dali
 * pela aba Aprovações (`aprovarInscricaoCaptacao`), que também pede a Data de Início.
 */
export function CaptacaoStatusSelect({
  id,
  status,
  action,
}: {
  id: string;
  status: CaptacaoStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-dourado ${CAPTACAO_STATUS_COR[status]}`}
      >
        {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </form>
  );
}
