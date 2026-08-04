import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { buscarConfigFpf } from "@/lib/fpf/sincronizar";
import { ConfigFpfForm } from "./config-fpf-form";

export default async function ConfigurarFpfPage() {
  const supabase = createClient();
  const config = await buscarConfigFpf(supabase);

  return (
    <AppShell>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Jogos
      </Link>
      <PageHeader title="Configurar integração FPF" />
      <div className="card mt-4 p-4">
        <ConfigFpfForm config={config} />
      </div>
    </AppShell>
  );
}
