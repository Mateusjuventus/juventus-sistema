"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

// Botão e campos deste formulário NÃO usam `.btn-primary`/`.field-input` (grená, cor do clube) —
// o Login é o único lugar do sistema com identidade visual própria da Proxis (ver nota em
// app/login/page.tsx), então os estilos aqui são escritos à parte, na cor da marca (`proxisAzul`).
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-md bg-proxisAzul px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-proxisAzul/90 hover:shadow-md hover:shadow-proxisAzul/30 focus:outline-none focus:ring-2 focus:ring-proxisAzul focus:ring-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-sm sm:py-2"
      disabled={pending}
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label htmlFor="email" className="field-label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="block w-full rounded-md border border-linha px-3 py-2.5 text-base shadow-sm focus:border-proxisAzul focus:outline-none focus:ring-1 focus:ring-proxisAzul sm:py-2 sm:text-sm"
          placeholder="voce@juventus.com.br"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-md border border-linha px-3 py-2.5 text-base shadow-sm focus:border-proxisAzul focus:outline-none focus:ring-1 focus:ring-proxisAzul sm:py-2 sm:text-sm"
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
