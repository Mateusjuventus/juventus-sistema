import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { RelatorioDispensaForm } from "@/components/relatorio-dispensa-form";
import { BlocoAssinaturaDigital } from "@/components/bloco-assinatura-digital";
import { papeisEsperados } from "@/lib/assinaturas/config";
import { buscarAssinaturas } from "@/lib/assinaturas/actions";
import type { AtletaBaseRow } from "@/lib/supabase/types";
import { salvarRelatorioDispensaTreinador } from "./actions";

/**
 * Relatório de Dispensa preenchido pelo Treinador (ver docs/superpowers/specs/
 * 2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) — só pros atletas das
 * categorias dele (mesma dupla checagem de `app/treinador/[id]/page.tsx`). Depois de gerado, fica
 * travado: mostra só o link do PDF, sem formulário editável — só o cadastro interno pode alterar.
 */
export default async function DispensaAtletaTreinadorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) redirect("/treinador");

  const { data } = await supabase.from("atletas_base").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const atleta = data as AtletaBaseRow;
  if (!atleta.categoria || !categorias.includes(atleta.categoria)) redirect("/treinador");

  const jaGerado = Boolean(atleta.dispensa_data);
  const action = salvarRelatorioDispensaTreinador.bind(null, atleta.id);
  const assinaturas = jaGerado ? await buscarAssinaturas("dispensa_base", atleta.id) : [];

  return (
    <div className="min-h-screen bg-pagina">
      <div className="bg-grena">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href="/treinador"
            className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-grena-escuro">{atleta.nome_completo}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {categoriaBaseLabel(atleta.categoria)} · {atleta.posicao}
          </p>
        </div>

        <div className="card mt-6 p-6">
          {jaGerado ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600">
                  Este relatório já foi gerado e está travado — só o cadastro interno pode alterá-lo agora.
                </p>
                <a
                  href={`/treinador/atletas/${atleta.id}/dispensa/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary mt-3 inline-block"
                >
                  Baixar PDF
                </a>
              </div>
              <BlocoAssinaturaDigital
                tipoDocumento="dispensa_base"
                documentoId={atleta.id}
                caminhoRevalidar={`/treinador/atletas/${atleta.id}/dispensa`}
                papeis={papeisEsperados("dispensa_base")}
                assinaturas={assinaturas}
                papeisQuePossoAssinar={["treinador"]}
              />
            </div>
          ) : (
            <RelatorioDispensaForm action={action} submitLabel="Gerar relatório de dispensa" />
          )}
        </div>
      </main>
    </div>
  );
}
