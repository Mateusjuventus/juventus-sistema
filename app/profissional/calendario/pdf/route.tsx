export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { CalendarioDocument, type CalendarioPdfItem } from "@/lib/pdf/calendario-document";
import { agruparPorDia, corDaCategoria, gradeDoMes, limitesDoMes, montarItensCalendario } from "@/lib/futebol/calendario";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { EventoCalendarioRow, JogoRow } from "@/lib/supabase/types";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Título de evento truncado pra caber na célula da grade (react-pdf não tem `text-overflow:
 * ellipsis`) — o texto completo continua disponível na tela (widget "Calendário"), o PDF é só uma
 * visão rápida do mês. */
function truncarTitulo(titulo: string, max = 16): string {
  return titulo.length > max ? `${titulo.slice(0, max - 1)}…` : titulo;
}

/** `ano`/`mes` vêm da URL como string (ou ausentes) — mesma validação da tela (ver
 * `mesDaUrl` em `app/profissional/calendario/page.tsx`), cai no mês atual quando ausente/inválido. */
function mesDaUrl(valor: string | null, min: number, max: number, padrao: number): number {
  const numero = Number(valor);
  return valor !== null && Number.isInteger(numero) && numero >= min && numero <= max ? numero : padrao;
}

/** Gera o PDF do widget "Calendário" como uma grade visual do mês — ver
 * `app/profissional/calendario-widget.tsx` e `lib/pdf/calendario-document.tsx`. Aceita `?ano=&mes=`
 * pra gerar o mês que está sendo visualizado na tela (decisão do Mateus em 04/11, ver
 * docs/superpowers/specs/2026-11-04-ajustes-rapidos-calendario-painel-atletas-design.md) —
 * ausentes/inválidos caem no mês corrente, mesmo comportamento de antes dessa navegação existir. */
export async function GET(request: Request) {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();
  const [anoHoje, mesHoje] = hojeStr.split("-").map(Number);
  const { searchParams } = new URL(request.url);
  const ano = mesDaUrl(searchParams.get("ano"), 2000, 2100, anoHoje);
  const mes = mesDaUrl(searchParams.get("mes"), 1, 12, mesHoje);
  const { inicio, fim } = limitesDoMes(ano, mes);

  const [{ data: jogosData }, { data: eventosData }] = await Promise.all([
    supabase
      .from("jogos")
      .select("*")
      .eq("categoria", "profissional")
      .gte("data_jogo", inicio)
      .lte("data_jogo", fim)
      .order("data_jogo"),
    supabase.from("eventos_calendario").select("*").gte("data", inicio).lte("data", fim).order("data"),
  ]);

  const jogos = (jogosData ?? []) as JogoRow[];
  const eventos = (eventosData ?? []) as EventoCalendarioRow[];

  const logoPorJogoId = new Map<string, string | null>(
    await Promise.all(
      jogos.map(async (jogo): Promise<[string, string | null]> => [
        jogo.id,
        await getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
      ]),
    ),
  );

  const itensDoMes = montarItensCalendario(jogos, eventos);
  const itensPorDiaCalendario = agruparPorDia(itensDoMes);

  const itensPorDia: Record<string, CalendarioPdfItem[]> = {};
  for (const [data, itens] of itensPorDiaCalendario) {
    itensPorDia[data] = itens.map((item): CalendarioPdfItem =>
      item.tipo === "jogo"
        ? {
            tipo: "jogo",
            horario: item.horario,
            mandante: item.jogo.mandante,
            adversarioNome: item.jogo.adversario_nome,
            adversarioLogoSrc: logoPorJogoId.get(item.jogo.id) ?? null,
          }
        : {
            tipo: "evento",
            horario: item.horario,
            titulo: truncarTitulo(item.titulo),
            cor: corDaCategoria(item.categoria),
          },
    );
  }

  const grade = gradeDoMes(ano, mes);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <CalendarioDocument
      juventusLogoSrc={juventusLogoSrc}
      mesLabel={`${MESES[mes - 1]} de ${ano}`}
      geradoEm={new Date()}
      hojeStr={hojeStr}
      grade={grade}
      itensPorDia={itensPorDia}
    />,
  );

  const mesArquivo = `${ano}-${String(mes).padStart(2, "0")}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="calendario-${mesArquivo}.pdf"`,
    },
  });
}
