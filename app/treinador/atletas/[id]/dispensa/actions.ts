"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { relatorioDispensaSchema } from "@/lib/validation/schemas";
import { autoAssinarComoCreator } from "@/lib/assinaturas/actions";
import { criarNotificacao } from "@/lib/notificacoes/actions";
import type { RelatorioDispensaFormState } from "@/components/relatorio-dispensa-form";

/**
 * Server Action do Relatório de Dispensa preenchido pelo Treinador (ver docs/superpowers/specs/
 * 2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) — mesma dupla checagem de
 * permissão de `salvarParecerCaptacao` (categoria do atleta precisa estar entre as categorias
 * liberadas pra esse treinador). Diferente da versão do cadastro interno
 * (`app/base/atletas/[categoria]/[id]/dispensa/actions.ts`): trava depois de gerado — se
 * `dispensa_data` já estiver preenchida (por ele mesmo ou pelo Mateus), não deixa salvar de novo.
 */
export async function salvarRelatorioDispensaTreinador(
  atletaId: string,
  _prevState: RelatorioDispensaFormState,
  formData: FormData,
): Promise<RelatorioDispensaFormState> {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) return { error: "Você não tem permissão para fazer isso." };

  const raw = {
    dispensaData: String(formData.get("dispensaData") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
    notaTecnica: String(formData.get("notaTecnica") ?? ""),
    notaFisica: String(formData.get("notaFisica") ?? ""),
    notaTatica: String(formData.get("notaTatica") ?? ""),
    notaComportamental: String(formData.get("notaComportamental") ?? ""),
  };
  const result = relatorioDispensaSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const { data: atleta } = await supabase
    .from("atletas_base")
    .select("categoria, dispensa_data, nome_completo")
    .eq("id", atletaId)
    .maybeSingle();
  if (!atleta || !atleta.categoria || !categorias.includes(atleta.categoria)) {
    return { error: "Você não tem permissão para gerar o relatório deste atleta." };
  }
  if (atleta.dispensa_data) {
    return { error: "Este relatório já foi gerado. Fale com o responsável do Futebol de Base para alterá-lo." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const data = result.data;
  const { error } = await supabase
    .from("atletas_base")
    .update({
      status: "dispensado",
      dispensa_data: data.dispensaData,
      dispensa_motivo: data.motivo,
      dispensa_nota_tecnica: data.notaTecnica,
      dispensa_nota_fisica: data.notaFisica,
      dispensa_nota_tatica: data.notaTatica,
      dispensa_nota_comportamental: data.notaComportamental,
      dispensado_por: user.id,
      dispensado_em: new Date().toISOString(),
    })
    .eq("id", atletaId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  // Quem preencheu já confirmou os dados ao enviar o formulário — auto-assina o papel dela
  // ("treinador") sem pedir senha de novo (ver docs/superpowers/specs/2026-08-28-assinatura-
  // digital-notificacoes-design.md). O papel "departamento" fica pendente, esperando o Mateus (ou
  // qualquer master) entrar e assinar — por isso o aviso abaixo.
  await autoAssinarComoCreator("dispensa_base", atletaId, "treinador", user.id);

  const { data: masters } = await supabase.from("perfis").select("id").eq("role", "master");
  const link = `/base/atletas/${atleta.categoria}/${atletaId}/dispensa`;
  await Promise.all(
    (masters ?? []).map((m) =>
      criarNotificacao({
        usuarioId: m.id,
        tipo: "assinatura_pendente",
        mensagem: `Relatório de Dispensa de ${atleta.nome_completo} está esperando sua assinatura.`,
        link,
      }),
    ),
  );

  revalidatePath("/treinador");
  redirect("/treinador");
}
