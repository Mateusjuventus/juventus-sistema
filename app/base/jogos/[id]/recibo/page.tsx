import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { ReciboJogoBaseRow, StaffOperacionalBaseComFuncaoRow } from "@/lib/supabase/types";
import { getJogoBaseEConvocados } from "../operacao-data";
import { ReciboFormBase } from "./recibo-form-base";
import { saveReciboBase } from "../operacao-actions";

/**
 * Espelha `app/jogos/[id]/recibo/page.tsx` para o Futebol de Base. Recibo de Pagamento é só pra
 * Staff Operacional — Comissão Técnica não entra aqui. Staff Operacional não precisa ser convocado
 * — buscamos todo o staff ativo direto do cadastro.
 */
export default async function ReciboBasePage({
  params,
}: {
  params: { id: string };
}) {
  const dados = await getJogoBaseEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao } = dados;

  if (!convocacao) {
    return (
      <AppShell departamento="futebol_base">
        <JogoTabsBase jogoId={jogo.id} active="recibo" />
        <AvisoSemConvocacao jogoId={jogo.id} convocacaoHref={`/base/jogos/${jogo.id}/convocacao`} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const [{ data: recibosData }, { data: staffData }] = await Promise.all([
    supabase.from("recibos_jogo_base").select("*").eq("jogo_id", jogo.id),
    supabase
      .from("staff_operacional_base")
      .select(
        "*, funcao:staff_funcoes_catalogo!staff_operacional_base_funcao_id_fkey(nome), funcao_terceirizada:staff_funcoes_catalogo!staff_operacional_base_funcao_terceirizada_id_fkey(nome)",
      )
      .eq("ativo", true)
      .order("nome_completo", { ascending: true }),
  ]);
  const recibos = (recibosData ?? []) as ReciboJogoBaseRow[];
  const staff = (staffData ?? []) as StaffOperacionalBaseComFuncaoRow[];
  const temRecibos = recibos.some((r) => r.valor !== null);

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="recibo" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Recibo de Pagamento</h1>
        {temRecibos ? (
          <div className="flex gap-2">
            <a
              href={`/base/jogos/${jogo.id}/recibo/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Recibos individuais (PDF)
            </a>
            <a
              href={`/base/jogos/${jogo.id}/recibo/pdf-consolidado`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Recibo consolidado (PDF)
            </a>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">Preencha ao menos um valor para liberar os PDFs.</span>
        )}
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Função e valor de pagamento de cada pessoa convocada nesse jogo específico — o valor já vem
        preenchido com o padrão cadastrado no Staff Operacional, mas pode ser ajustado aqui.
      </p>

      <ReciboFormBase action={saveReciboBase} jogoId={jogo.id} staff={staff} recibos={recibos} />
    </AppShell>
  );
}
