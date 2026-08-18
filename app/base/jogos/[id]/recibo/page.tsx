import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import type {
  JogoBaseRow,
  ReciboJogoBaseRow,
  StaffOperacionalBaseComFuncaoRow,
} from "@/lib/supabase/types";
import { ReciboFormBase } from "./recibo-form-base";
import { saveReciboBase } from "../operacao-actions";

/**
 * Espelha `app/jogos/[id]/recibo/page.tsx` para o Futebol de Base. Recibo de Pagamento é só pra
 * Staff Operacional — Comissão Técnica não entra aqui. Staff Operacional não precisa ser convocado
 * (a convocação é de atletas e comissão), então buscamos todo o staff ativo direto do cadastro.
 *
 * Por isso esta tela NÃO depende de convocação nenhuma: basta o jogo existir. Ela chegou a bloquear
 * com o aviso "monte a convocação primeiro", sobra de quando a Comissão Técnica ainda aparecia
 * aqui — o Profissional já tinha sido corrigido, a Base ficou pra trás.
 */
export default async function ReciboBasePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: recibosData }, { data: staffData }, { data: vagasData }] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("id", params.id).single(),
    supabase.from("recibos_jogo_base").select("*").eq("jogo_id", params.id),
    supabase
      .from("staff_operacional_base")
      .select(
        "*, funcao:staff_funcoes_catalogo!staff_operacional_base_funcao_id_fkey(nome), funcao_terceirizada:staff_funcoes_catalogo!staff_operacional_base_funcao_terceirizada_id_fkey(nome)",
      )
      .eq("ativo", true)
      .order("nome_completo", { ascending: true }),
    // Quem pegou vaga na aba "Vagas de Staff" — usado só como sugestão inicial (ver ReciboFormBase).
    supabase.from("jogo_vagas_staff_base").select("id").eq("jogo_id", params.id).maybeSingle(),
  ]);

  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;
  const recibos = (recibosData ?? []) as ReciboJogoBaseRow[];
  const staff = (staffData ?? []) as StaffOperacionalBaseComFuncaoRow[];
  const temRecibos = recibos.length > 0;

  let staffComVaga: string[] = [];
  const vagasId = (vagasData?.id as string | undefined) ?? null;
  if (vagasId) {
    const { data: inscricoesData } = await supabase
      .from("jogo_vagas_staff_base_inscricoes")
      .select("staff_id")
      .eq("vagas_id", vagasId)
      .eq("situacao", "confirmado");
    staffComVaga = ((inscricoesData ?? []) as { staff_id: string }[]).map((i) => i.staff_id);
  }

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
          <span className="text-xs text-neutral-400">Marque e salve ao menos uma pessoa para liberar os PDFs.</span>
        )}
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Marque &quot;Incluir&quot; para quem realmente participou desse jogo — só quem for marcado
        entra nos PDFs. O valor já vem preenchido com o padrão cadastrado no Staff Operacional, mas
        pode ser ajustado aqui.
      </p>

      <ReciboFormBase
        action={saveReciboBase}
        jogoId={jogo.id}
        staff={staff}
        recibos={recibos}
        staffComVaga={staffComVaga}
      />
    </AppShell>
  );
}
