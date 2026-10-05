import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import { BlocoAssinaturaDigital } from "@/components/bloco-assinatura-digital";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import { buscarAssinaturas, possuiAssinaturaCadastrada, resolverImagensAssinaturas } from "@/lib/assinaturas/actions";
import { papeisEsperados } from "@/lib/assinaturas/config";
import type { AssistenciaSocialAtendimentoRow, AtletaBaseRow } from "@/lib/supabase/types";
import { AtendimentoItem, NovoAtendimentoForm } from "./atendimento-forms";

/**
 * Ficha do atleta no módulo Assistência Social — dados sociais (nada de CPF/contrato, mesmo
 * critério da listagem) + histórico de atendimentos cronológico + link pro Parecer Social em PDF.
 * Ver docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md, Parte 1.
 */
export default async function AssistenciaSocialAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: atletaData }, { data: atendimentosData }] = await Promise.all([
    supabase.from("atletas_base").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("assistencia_social_atendimentos")
      .select("*")
      .eq("atleta_id", params.id)
      .order("data", { ascending: false }),
  ]);

  if (!atletaData) notFound();
  const atleta = atletaData as AtletaBaseRow;
  const atendimentos = (atendimentosData ?? []) as AssistenciaSocialAtendimentoRow[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [fotoUrl, assinaturas, minhaAssinaturaCadastrada] = await Promise.all([
    getSignedPhotoUrl(supabase, atleta.foto_path),
    resolverImagensAssinaturas(supabase, await buscarAssinaturas("parecer_social", atleta.id)),
    user ? possuiAssinaturaCadastrada(supabase, user.id) : Promise.resolve(false),
  ]);

  return (
    <AppShell departamento="futebol_base" breadcrumb="Ficha do atleta">
      <Link href="/base/assistencia-social" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <AtletaAvatarCirculo nome={atleta.nome_completo} fotoUrl={fotoUrl} className="h-16 w-16" />
          <div>
            <p className="text-lg font-semibold text-neutral-800">{atleta.nome_completo}</p>
            {atleta.apelido ? <p className="text-sm text-neutral-500">&ldquo;{atleta.apelido}&rdquo;</p> : null}
            <p className="mt-1 text-sm text-neutral-500">
              {categoriaBaseLabel(atleta.categoria)} · Nasc. {formatDataBr(atleta.data_nascimento)}
            </p>
          </div>
        </div>
        <a href={`/base/assistencia-social/${atleta.id}/parecer`} className="btn-secondary" target="_blank">
          Gerar Parecer Social em PDF
        </a>
      </div>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Assinatura do Parecer Social</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Quem assinar aqui aparece como Assistente Social no PDF gerado acima.
        </p>
        <div className="mt-3">
          <BlocoAssinaturaDigital
            tipoDocumento="parecer_social"
            documentoId={atleta.id}
            caminhoRevalidar={`/base/assistencia-social/${atleta.id}`}
            papeis={papeisEsperados("parecer_social")}
            assinaturas={assinaturas}
            papeisQuePossoAssinar={["assistente_social"]}
            minhaAssinaturaCadastrada={minhaAssinaturaCadastrada}
          />
        </div>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Dados sociais</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-400">Telefone</dt>
            <dd className="text-neutral-700">{atleta.telefone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Naturalidade</dt>
            <dd className="text-neutral-700">
              {atleta.cidade_natal ? `${atleta.cidade_natal}${atleta.uf_natal ? `/${atleta.uf_natal}` : ""}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-400">Escola</dt>
            <dd className="text-neutral-700">{atleta.escola ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Mora no alojamento</dt>
            <dd className="text-neutral-700">{atleta.alojado ? "Sim" : "Não"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Mãe</dt>
            <dd className="text-neutral-700">
              {atleta.mae_nome ?? "—"}
              {atleta.mae_telefone ? ` · ${atleta.mae_telefone}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-400">Pai</dt>
            <dd className="text-neutral-700">
              {atleta.pai_nome ?? "—"}
              {atleta.pai_telefone ? ` · ${atleta.pai_telefone}` : ""}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-400">Alergia a medicamento</dt>
            <dd className="text-neutral-700">
              {atleta.possui_alergia_medicamento ? atleta.alergia_medicamento_qual ?? "Sim" : "Não"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Atendimentos</h2>
        {atendimentos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhum atendimento registrado ainda.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {atendimentos.map((atendimento) => (
              <li key={atendimento.id} className="border-t border-neutral-100 pt-2">
                <AtendimentoItem atletaId={atleta.id} atendimento={atendimento} />
              </li>
            ))}
          </ul>
        )}
        <NovoAtendimentoForm atletaId={atleta.id} />
      </section>
    </AppShell>
  );
}
