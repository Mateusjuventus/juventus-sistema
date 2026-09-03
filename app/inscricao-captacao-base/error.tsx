"use client";

import { useEffect } from "react";
import { PublicFormError } from "@/components/public-form-error";

/** Ver components/public-form-error.tsx para o porquê desta tela existir. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[inscricao-captacao-base]", error);
  }, [error]);

  return <PublicFormError reset={reset} />;
}
