import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabsBase } from "@/components/atleta-tabs-base";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { isMaster } from "@/lib/auth/role";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { montarHistoricoAtletaBase } from "@/lib/futebol/anotacoes-atleta";
import type { AtletaBaseAnotacaoRow, AtletaBaseRow } from "@/lib/supabase/types";
import { AnotacaoFormBase } from "./anotacao-form-base";
import { adicionarAnotacaoBase, removerAnotacaoBase } from "../../../actions";

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

/** Aba "Anotações" do perfil do atleta (Base) — mistura o histórico de anotações do cadastro interno
 * e do Treinador com a entrada "virtual" de Relatório de Dispensa, quando houver (ver
 * `montarHistoricoAtletaBase`). Ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-
 * design.md. */
export default async function AnotacoesAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();

  const [{ data: atletaData }, { data: anotacoesData }, souMaster] = await Promise.all([
    supabase.from("atletas_base").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_base_anotacoes")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
    isMaster(supabase),
  ]);

  if (!atletaData) notFound();

  const atleta = atletaData as AtletaBaseRow;
  const anotacoes = (anotacoesData ?? []) as AtletaBaseAnotacaoRow[];

  let dispensadoPorNome: string | null = null;
  if (atleta.dispensado_por) {
    const { data: perfilDispensa } = await supabase
      .from("perfis")
      .select("nome, email")
      .eq("id", atleta.dispensado_por)
      .maybeSingle();
    const perfil = perfilDispensa as { nome: string | null; email: string } | null;
    dispensadoPorNome = perfil?.nome?.trim() ? perfil.nome : (perfil?.email ?? null);
  }

  const historico = montarHistoricoAtletaBase(
    anotacoes,
    atleta,
    dispensadoPorNome,
    `/base/atletas/${params.categoria}/${atleta.id}/dispensa/pdf`,
  );

  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${
    atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""
  }`;

  return (
    <AppShell departamento="futebol_base" breadcrumb="Anotações">
      <AtletaTabsBase categoria={params.categoria} atletaId={atleta.id} active="anotacoes" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/base/atletas/${params.categoria}/${atleta.id}`}
      />

      <section className="card mt-6 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Anotações</h2>

        <div className="mt-3 space-y-2">
          {historico.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-start gap-3 rounded-md px-3 py-2 text-sm ${
                item.tipo === "dispensa"
                  ? "border-l-4 border-l-grena bg-neutral-50"
                  : "bg-neutral-50"
              }`}
            >
              <div className="min-w-[200px] flex-1">
                {item.tipo === "dispensa" ? (
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-grena">
                    Relatório de Dispensa
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap text-neutral-800">{item.texto}</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs text-neutral-500">
                  {item.autor ?? "—"} · {formatDataHora(item.data)}
                </span>
                {item.tipo === "dispensa" ? (
                  <a href={item.linkPdf} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    Ver PDF
                  </a>
                ) : souMaster ? (
                  <DeleteButton action={removerAnotacaoBase} id={item.id} entityLabel="anotação" />
                ) : null}
              </div>
            </div>
          ))}
          {historico.length === 0 ? <p className="text-sm text-neutral-400">Nenhuma anotação ainda.</p> : null}
        </div>

        <div className="mt-3">
          <AnotacaoFormBase action={adicionarAnotacaoBase} atletaId={atleta.id} categoria={params.categoria} />
        </div>
      </section>
    </AppShell>
  );
}
