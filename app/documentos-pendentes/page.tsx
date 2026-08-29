import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { buscarPendenciasDoUsuario } from "@/lib/assinaturas/pendencias";

/**
 * Central "Documentos Pendentes de Assinatura" (Fase 3 — ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md): junta, de todos os tipos de documento, só
 * o que ESSA pessoa pode assinar agora — complementa o sino/push (que avisam na hora), útil pra
 * quem quer conferir tudo que falta de uma vez, ou não recebeu o aviso por qualquer motivo.
 */
export default async function DocumentosPendentesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const master = await isMaster(supabase);
  const pendencias = user ? await buscarPendenciasDoUsuario(user.id, master) : [];

  return (
    <AppShell breadcrumb="Documentos Pendentes">
      <PageHeader title="Documentos Pendentes de Assinatura" />
      <p className="mx-auto -mt-2 max-w-2xl text-center text-sm text-neutral-500">
        Tudo que está esperando a SUA assinatura agora, de qualquer tipo de documento.
      </p>

      {!user ? null : pendencias.length === 0 ? (
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-400">
          Nenhum documento esperando sua assinatura no momento.
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-2xl space-y-3">
          {pendencias.map((p, i) => (
            <Link
              key={`${p.link}-${p.papelRotulo}-${i}`}
              href={p.link}
              className="card flex items-center justify-between gap-4 p-4 transition-colors hover:bg-neutral-50"
            >
              <div>
                <p className="font-medium text-neutral-800">{p.titulo}</p>
                <p className="text-sm text-neutral-500">Assinatura pendente: {p.papelRotulo}</p>
              </div>
              <span className="btn-secondary btn-sm shrink-0">Assinar</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
