import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { SolicitacaoForm } from "../solicitacao-form";
import { createSolicitacaoBase } from "../actions";

export default async function NovaSolicitacaoBasePage() {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const supabase = createClient();
  const master = await isMaster(supabase);
  // Quem não é Master sempre aparece como o próprio Solicitante (ver
  // docs/superpowers/specs/2026-09-13-solicitacoes-autoria-visibilidade-design.md) — o nome digitado
  // aqui é só o que aparece na tela; o valor de verdade é recalculado no servidor ao salvar.
  const solicitante = master ? "Mateus dos Santos Pereira" : ((await nomeDaContaAtual(supabase)) ?? "");

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/solicitacoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova solicitação</h1>
      <div className="mt-4">
        <SolicitacaoForm
          action={createSolicitacaoBase}
          defaultValues={{
            dataSolicitacao: hojeStr,
            solicitante,
            setor: "Futebol de Base",
          }}
          submitLabel="Cadastrar"
          solicitanteTravado={!master}
        />
      </div>
    </AppShell>
  );
}
