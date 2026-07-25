import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import type { ReciboJogoRow, StaffOperacionalComFuncaoRow } from "@/lib/supabase/types";
import { getJogoEConvocados } from "../operacao-data";
import { ReciboForm } from "./recibo-form";
import { saveRecibo } from "../operacao-actions";

/**
 * Comissão Técnica continua vindo da convocação do jogo, mas Staff Operacional não precisa mais
 * ser convocado — aqui buscamos todo o staff ativo direto do cadastro (ver observação do Mateus:
 * staff só aparece pra Credenciamento e Recibo, sem depender de convocação).
 */
export default async function ReciboPage({ params }: { params: { id: string } }) {
  const dados = await getJogoEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, comissao } = dados;

  if (!convocacao) {
    return (
      <AppShell>
        <JogoTabs jogoId={jogo.id} active="recibo" />
        <AvisoSemConvocacao jogoId={jogo.id} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const [{ data: recibosData }, { data: staffData }] = await Promise.all([
    supabase.from("recibos_jogo").select("*").eq("jogo_id", jogo.id),
    supabase
      .from("staff_operacional")
      .select("*, funcao:staff_funcoes_catalogo!staff_operacional_funcao_id_fkey(nome)")
      .eq("ativo", true)
      .order("nome_completo", { ascending: true }),
  ]);
  const recibos = (recibosData ?? []) as ReciboJogoRow[];
  const staff = (staffData ?? []) as StaffOperacionalComFuncaoRow[];
  const temRecibos = recibos.some((r) => r.valor !== null);

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="recibo" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Recibo de Pagamento</h1>
        {temRecibos ? (
          <div className="flex gap-2">
            <a
              href={`/jogos/${jogo.id}/recibo/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Recibos individuais (PDF)
            </a>
            <a
              href={`/jogos/${jogo.id}/recibo/pdf-consolidado`}
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

      <ReciboForm action={saveRecibo} jogoId={jogo.id} comissao={comissao} staff={staff} recibos={recibos} />
    </AppShell>
  );
}
