import { Suspense } from "react";
import { ProxisLogo } from "@/components/proxis-brand";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-grena-escuro px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <ProxisLogo className="h-16 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Proxis — Gestão Esportiva</h1>
          <p className="mt-1 text-sm text-white/70">Operando para Clube Atlético Juventus</p>
        </div>
        <div className="card p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
