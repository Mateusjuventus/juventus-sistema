import type { createAdminClient } from "@/lib/supabase/admin";
import { queryDireto } from "@/lib/supabase/direct-db";

export interface StaffAtivoParaVagas {
  id: string;
  nome_completo: string;
  funcao_id: string | null;
  funcao_terceirizada_id: string | null;
  terceirizada: boolean;
}

/**
 * Lista o Staff Operacional ativo pra tela pública de Vagas (o "selecione seu nome" de
 * `app/vagas/[token]/page.tsx` e `app/vagas-base/[token]/page.tsx`) — ver
 * docs/superpowers/specs/2026-09-13-vagas-leitura-direta-banco-design.md.
 *
 * Tenta primeiro `queryDireto` (conexão direta com o Postgres, sem passar pela API do Supabase) e
 * só cai pra consulta normal via `admin` (a API, com `service_role`) se a direta não estiver
 * disponível — variável de ambiente ainda não configurada, ou falha de conexão. Nesse caso o
 * comportamento é exatamente o mesmo de antes desta mudança, então não há risco de regressão
 * enquanto `SUPABASE_DIRECT_DB_URL` não estiver definida.
 *
 * `tabela` só recebe um destes dois literais fixos (nunca entrada de usuário) — é seguro interpolar
 * direto no SQL da leitura direta.
 */
export async function listarStaffAtivoParaVagas(
  admin: ReturnType<typeof createAdminClient>,
  tabela: "staff_operacional" | "staff_operacional_base",
): Promise<StaffAtivoParaVagas[]> {
  try {
    return await queryDireto<StaffAtivoParaVagas>(
      `select id, nome_completo, funcao_id, funcao_terceirizada_id, terceirizada
         from ${tabela}
        where ativo = true
        order by nome_completo asc`,
    );
  } catch (err) {
    console.error(`[vagas] leitura direta indisponível (${tabela}), caiu pra consulta via API:`, err);
    const { data } = await admin
      .from(tabela)
      .select("id, nome_completo, funcao_id, funcao_terceirizada_id, terceirizada")
      .eq("ativo", true)
      .order("nome_completo", { ascending: true });
    return (data ?? []) as StaffAtivoParaVagas[];
  }
}
