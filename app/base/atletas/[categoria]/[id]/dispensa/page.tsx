import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RelatorioDispensaForm } from "@/components/relatorio-dispensa-form";
import { BlocoAssinaturaDigital } from "@/components/bloco-assinatura-digital";
import { papeisEsperados } from "@/lib/assinaturas/config";
import { buscarAssinaturas } from "@/lib/assinaturas/actions";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";
import { salvarRelatorioDispensaAdmin } from "./actions";

/**
 * Tela do cadastro interno pra gerar/editar o Relatório de Dispensa de um atleta da Base (ver
 * docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) —
 * diferente do Parecer Final (só Captação). O Mateus pode gerar mesmo que o Treinador já tenha
 * gerado antes, sem trava nenhuma (a trava é só do lado do Treinador).
 */
export default async function DispensaAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();
  const { data } = await supabase.from("atletas_base").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const atleta = data as AtletaBaseRow;

  const jaGerado = Boolean(atleta.dispensa_data);
  const action = salvarRelatorioDispensaAdmin.bind(null, atleta.id, params.categoria);
  const assinaturas = jaGerado ? await buscarAssinaturas("dispensa_base", atleta.id) : [];

  const defaultValues: Record<string, string> = {
    dispensaData: atleta.dispensa_data ?? "",
    motivo: atleta.dispensa_motivo ?? "",
    notaTecnica: atleta.dispensa_nota_tecnica?.toString() ?? "",
    notaFisica: atleta.dispensa_nota_fisica?.toString() ?? "",
    notaTatica: atleta.dispensa_nota_tatica?.toString() ?? "",
    notaComportamental: atleta.dispensa_nota_comportamental?.toString() ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link
        href={`/base/atletas/${params.categoria}/${atleta.id}/ver`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Relatório de Dispensa — {atleta.nome_completo}</h1>
        {jaGerado ? (
          <a href={`/base/atletas/${params.categoria}/${atleta.id}/dispensa/pdf`} target="_blank" rel="noreferrer" className="btn-secondary">
            Baixar PDF
          </a>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {jaGerado
          ? "Este relatório já foi gerado. Alterar e salvar atualiza o PDF e mantém o atleta como Dispensado."
          : "Ao salvar, o atleta passa para o status Dispensado."}
      </p>

      <div className="mt-4 space-y-4">
        <RelatorioDispensaForm
          action={action}
          defaultValues={defaultValues}
          submitLabel={jaGerado ? "Salvar alterações" : "Gerar relatório de dispensa"}
        />
        {jaGerado ? (
          <BlocoAssinaturaDigital
            tipoDocumento="dispensa_base"
            documentoId={atleta.id}
            caminhoRevalidar={`/base/atletas/${params.categoria}/${atleta.id}/dispensa`}
            papeis={papeisEsperados("dispensa_base")}
            assinaturas={assinaturas}
            papeisQuePossoAssinar={["departamento"]}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
