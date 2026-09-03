"use client";

import { useEffect } from "react";
import { PublicFormError } from "@/components/public-form-error";

/** Ver components/public-form-error.tsx para o porquê desta tela existir. Dimensões menores
 * (`max-w-md`/`h-20`/`py-8`) pra bater com o layout mais estreito de app/vagas/[token]/page.tsx. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[vagas]", error);
  }, [error]);

  return <PublicFormError reset={reset} maxWidth="max-w-md" crestClassName="h-20 w-auto drop-shadow-lg" padding="py-8" />;
}
