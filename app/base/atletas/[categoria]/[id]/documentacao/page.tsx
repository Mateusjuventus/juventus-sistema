import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabsBase } from "@/components/atleta-tabs-base";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedDocumentoUrl, getSignedPhotoUrl } from "@/lib/supabase/storage";
import { categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow, AtletaDocumentoBaseRow } from "@/lib/supabase/types";
import { DocumentoFormBase } from "./documento-form-base";
import { adicionarDocumentoBase, removerDocumentoBase } from "./actions";

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

/** Espelha `app/atletas/[id]/documentacao/page.tsx` para o Futebol de Base. */
export default async function DocumentacaoAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();

  const [{ data: atletaData }, { data: documentosData }] = await Promise.all([
    supabase.from("atletas_base").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_documentos_base")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!atletaData) notFound();

  const atleta = atletaData as AtletaBaseRow;
  const documentos = (documentosData ?? []) as AtletaDocumentoBaseRow[];
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  const documentosComUrl = await Promise.all(
    documentos.map(async (d) => ({ ...d, url: await getSignedDocumentoUrl(supabase, d.arquivo_path) })),
  );

  return (
    <AppShell departamento="futebol_base">
      <AtletaTabsBase categoria={params.categoria} atletaId={atleta.id} active="documentacao" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/base/atletas/${params.categoria}/${atleta.id}`}
      />

      <section className="card mt-6 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Documentos</h2>

        <div className="mt-3 space-y-2">
          {documentosComUrl.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="min-w-[160px] flex-1 font-medium text-neutral-800">{doc.nome}</span>
              <span className="text-xs text-neutral-500">Enviado em {formatDataHora(doc.created_at)}</span>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Abrir
                </a>
              ) : null}
              <DeleteButton action={removerDocumentoBase} id={doc.id} entityLabel="documento" />
            </div>
          ))}
          {documentos.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum documento anexado ainda.</p>
          ) : null}
        </div>

        <div className="mt-3">
          <DocumentoFormBase action={adicionarDocumentoBase} atletaId={atleta.id} categoria={params.categoria} />
        </div>
      </section>
    </AppShell>
  );
}
