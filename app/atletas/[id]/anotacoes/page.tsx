import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { isMaster } from "@/lib/auth/role";
import { montarHistoricoAtleta } from "@/lib/futebol/anotacoes-atleta";
import type { AtletaAnotacaoRow, AtletaRow } from "@/lib/supabase/types";
import { AnotacaoForm } from "./anotacao-form";
import { adicionarAnotacao, removerAnotacao } from "../../actions";

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

/** Aba "Anotações" do perfil do atleta (Profissional) — histórico de texto livre com autor e data,
 * escrito pelo cadastro interno (o Profissional não tem Treinador com login próprio). Ver
 * docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md. */
export default async function AnotacoesAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: atletaData }, { data: anotacoesData }, souMaster] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_anotacoes")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
    isMaster(supabase),
  ]);

  if (!atletaData) notFound();

  const atleta = atletaData as AtletaRow;
  const anotacoes = (anotacoesData ?? []) as AtletaAnotacaoRow[];
  const historico = montarHistoricoAtleta(anotacoes);
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  return (
    <AppShell breadcrumb="Anotações">
      <AtletaTabs atletaId={atleta.id} active="anotacoes" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/atletas/${atleta.id}`}
      />

      <section className="card mt-6 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Anotações</h2>

        <div className="mt-3 space-y-2">
          {historico.map((item) => (
            <div key={item.id} className="flex flex-wrap items-start gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">
              <p className="min-w-[200px] flex-1 whitespace-pre-wrap text-neutral-800">{item.texto}</p>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs text-neutral-500">
                  {item.autor ?? "—"} · {formatDataHora(item.data)}
                </span>
                {souMaster ? <DeleteButton action={removerAnotacao} id={item.id} entityLabel="anotação" /> : null}
              </div>
            </div>
          ))}
          {historico.length === 0 ? <p className="text-sm text-neutral-400">Nenhuma anotação ainda.</p> : null}
        </div>

        <div className="mt-3">
          <AnotacaoForm action={adicionarAnotacao} atletaId={atleta.id} />
        </div>
      </section>
    </AppShell>
  );
}
