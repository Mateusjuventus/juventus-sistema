export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sincronizarJogosFpf } from "@/lib/fpf/sincronizar";

/**
 * Rota chamada pelo agendamento diário (ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md,
 * seção "Atualização automática diária + botão manual"). Protegida por um token secreto, pra não
 * poder ser disparada por qualquer um.
 *
 * Exemplo de configuração pra Vercel Cron (se o sistema for hospedado lá — ajustar se for outro
 * lugar, a lógica de sincronização em si não muda), em `vercel.json` na raiz do projeto:
 *
 * {
 *   "crons": [{ "path": "/api/fpf/sincronizar", "schedule": "0 9 * * *" }]
 * }
 *
 * A Vercel já envia automaticamente o header `Authorization: Bearer $CRON_SECRET` nas chamadas de
 * cron — configurar `FPF_SYNC_SECRET` com o mesmo valor de `CRON_SECRET` nas variáveis de
 * ambiente do projeto.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const segredoConfigurado = process.env.FPF_SYNC_SECRET;
  if (!segredoConfigurado) {
    return NextResponse.json({ erro: "FPF_SYNC_SECRET não configurado." }, { status: 500 });
  }

  const autorizacao = request.headers.get("authorization");
  if (autorizacao !== `Bearer ${segredoConfigurado}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createClient();
  const resultado = await sincronizarJogosFpf(supabase, "automatica");

  return NextResponse.json(resultado, { status: resultado.sucesso ? 200 : 502 });
}
