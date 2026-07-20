import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { AvisoSemConvocacao } from "@/components/aviso-sem-convocacao";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { ReciboJogoBaseRow } from "@/lib/supabase/types";
import { getJogoBaseEConvocados } from "../operacao-data";
import { ReciboFormBase } from "./recibo-form-base";
import { saveReciboBase } from "../operacao-actions";

/** Espelha `app/jogos/[id]/recibo/page.tsx` para o Futebol de Base. */
export default async function ReciboBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const dados = await getJogoBaseEConvocados(params.id);
  if (!dados) notFound();
  const { jogo, convocacao, comissao, staff } = dados;

  if (!convocacao) {
    return (
      <AppShell departamento="futebol_base">
        <JogoTabsBase jogoId={jogo.id} categoria={categoria} active="recibo" />
        <AvisoSemConvocacao jogoId={jogo.id} convocacaoHref={`/base/jogos/${categoria}/${jogo.id}/convocacao`} />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: recibosData } = await supabase.from("recibos_jogo_base").select("*").eq("jogo_id", jogo.id);
  const recibos = (recibosData ?? []) as ReciboJogoBaseRow[];
  const temRecibos = recibos.some((r) => r.valor !== null);

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} categoria={categoria} active="recibo" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Recibo de Pagamento</h1>
        {temRecibos ? (
          <div className="flex gap-2">
            <a
              href={`/base/jogos/${categoria}/${jogo.id}/recibo/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Recibos individuais (PDF)
            </a>
            <a
              href={`/base/jogos/${categoria}/${jogo.id}/recibo/pdf-consolidado`}
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

      <ReciboFormBase action={saveReciboBase} jogoId={jogo.id} comissao={comissao} staff={staff} recibos={recibos} />
    </AppShell>
  );
}
