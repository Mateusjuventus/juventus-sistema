"use client";

import { useEffect, useRef } from "react";

/**
 * Fecha o modal sozinho quando o `useFormState` volta sem erro depois de uma submissão de verdade
 * (nunca no mount) — os Server Actions da Programação (`lib/programacao/actions.ts`) não fazem
 * `redirect`, só `revalidatePath` (o modal não tem uma URL própria pra redirecionar), então quem
 * percebe o sucesso e fecha o modal é o próprio componente.
 */
export function useFecharAoSalvar(
  state: { error?: string; fieldErrors?: Record<string, string> },
  onDone: () => void,
) {
  const primeiraRef = useRef(state);
  useEffect(() => {
    if (state === primeiraRef.current) return;
    if (!state.error && !state.fieldErrors) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
