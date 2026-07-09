import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-grena-escuro px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-grena-escuro">Sistema Juventus</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Central de cadastros e operação do futebol profissional
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
