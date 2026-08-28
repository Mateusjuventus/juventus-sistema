"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Sino de notificações (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-
 * design.md) — hoje só um tipo de evento dispara notificação: um documento foi criado/enviado e
 * está esperando a assinatura de alguém. `usuario_id` é sempre quem deve VER o aviso (o assinante
 * pendente), nunca quem criou o documento.
 *
 * Chamada a partir de dentro de outras Server Actions (ex.: ao salvar um Relatório de Dispensa) —
 * por isso não devolve nada pra tela: se falhar, o documento em si já foi salvo com sucesso, só o
 * aviso que não saiu. Preferível a travar o fluxo principal por causa disso.
 */
export async function criarNotificacao(params: {
  usuarioId: string;
  tipo: string;
  mensagem: string;
  link?: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: notificacao, error } = await supabase
    .from("notificacoes")
    .insert({
      usuario_id: params.usuarioId,
      tipo: params.tipo,
      mensagem: params.mensagem,
      link: params.link ?? null,
    })
    .select("id")
    .single();
  if (error || !notificacao) return;

  // Push é "melhor esforço": dispara em paralelo, nunca bloqueia nem derruba a notificação em si
  // se a pessoa não tiver aceitado push ainda (o mais comum) ou se o envio falhar por qualquer
  // motivo (inscrição expirada etc.) — ver lib/push/enviar.ts.
  const { enviarPushParaUsuario } = await import("@/lib/push/enviar");
  await enviarPushParaUsuario(params.usuarioId, { titulo: "Juventus SAF", corpo: params.mensagem, link: params.link });
}

/**
 * Notifica quem precisa assinar um papel CONFIGURÁVEL (pode estar vinculado a um usuário
 * específico, ou não — nesse caso qualquer master pode assinar) — mesma regra de quem PODE assinar
 * (ver lib/assinaturas/config.ts, podeAssinarPapel). Se vinculado, avisa só aquela pessoa; se não,
 * avisa todo mundo com role "master" (mesmo padrão já usado pro papel "departamento" do Relatório
 * de Dispensa, que também não tem uma pessoa fixa).
 */
export async function notificarSignerConfiguravel(params: {
  usuarioVinculado: string | null | undefined;
  tipo: string;
  mensagem: string;
  link?: string;
}): Promise<void> {
  const supabase = createClient();
  if (params.usuarioVinculado) {
    await criarNotificacao({
      usuarioId: params.usuarioVinculado,
      tipo: params.tipo,
      mensagem: params.mensagem,
      link: params.link,
    });
    return;
  }
  const { data: masters } = await supabase.from("perfis").select("id").eq("role", "master");
  await Promise.all(
    (masters ?? []).map((m) =>
      criarNotificacao({ usuarioId: m.id, tipo: params.tipo, mensagem: params.mensagem, link: params.link }),
    ),
  );
}

export async function marcarNotificacaoComoLida(id: string, caminhoRevalidar: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id).eq("usuario_id", user.id);
  revalidatePath(caminhoRevalidar);
}

export async function marcarTodasComoLidas(caminhoRevalidar: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", user.id).eq("lida", false);
  revalidatePath(caminhoRevalidar);
}

export async function buscarNotificacoes(): Promise<
  { id: string; tipo: string; mensagem: string; link: string | null; lida: boolean; criadoEm: string }[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notificacoes")
    .select("id, tipo, mensagem, link, lida, criado_em")
    .eq("usuario_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(30);
  return (data ?? []).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    mensagem: n.mensagem,
    link: n.link,
    lida: n.lida,
    criadoEm: n.criado_em,
  }));
}
