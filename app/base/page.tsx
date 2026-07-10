import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SproutIcon } from "@/components/department-icon";

export default function BasePage() {
  return (
    <AppShell nav="none">
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Início
      </Link>
      <div className="mt-10 flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-300 text-white">
          <SproutIcon className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-bold text-neutral-600">Futebol de Base</h1>
        <p className="max-w-md text-neutral-500">
          Os cadastros do Futebol de Base ainda não foram construídos. Quando esse módulo for
          desenhado, ele aparece aqui com a mesma estrutura do Futebol Profissional.
        </p>
        <span className="mt-1 w-fit rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600">
          Em breve
        </span>
      </div>
    </AppShell>
  );
}
