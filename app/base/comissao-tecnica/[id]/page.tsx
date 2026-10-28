import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Edição unificada agora vive em `/comissao-tecnica/[id]` — ver docs/superpowers/specs/2026-10-28-
 * unificacao-comissao-tecnica-design.md. O `id` antigo da Base continua valendo pra quem não tinha
 * duplicata por CPF no Profissional (a migration 0149 preserva o id original nesse caso) — mas pra
 * quem tinha (ex.: um coordenador que já estava nas duas listas), o id sobrevivente é o do registro
 * do Profissional, então um link antigo guardado precisa dessa segunda consulta (via CPF, na tabela
 * antiga `comissao_tecnica_base_old`, mantida até a confirmação final da migração) pra não cair em
 * 404.
 */
export default async function EditarComissaoBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: direto } = await supabase.from("comissao_tecnica").select("id").eq("id", params.id).maybeSingle();
  if (direto) redirect(`/comissao-tecnica/${direto.id}`);

  const { data: antigo } = await supabase
    .from("comissao_tecnica_base_old")
    .select("cpf")
    .eq("id", params.id)
    .maybeSingle();
  if (antigo) {
    const { data: unificado } = await supabase
      .from("comissao_tecnica")
      .select("id")
      .eq("cpf", antigo.cpf)
      .maybeSingle();
    if (unificado) redirect(`/comissao-tecnica/${unificado.id}`);
  }

  notFound();
}
