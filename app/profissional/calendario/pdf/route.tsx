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

/** Gera o PDF do widget "Calendário" (mês corrente) como uma grade visual do mês — ver
 * `app/profissional/calendario-widget.tsx` e `lib/pdf/calendario-document.tsx`. Sem parâmetro de
 * mês por enquanto: sempre o mês corrente, mesmo recorte que a Home mostra. */
export async function GET() {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();
  const [ano, mes] = hojeStr.split("-").map(Number);
  const { inicio, fim } = limitesDoMes(ano, mes);

  const [{ data: jogosData }, { data: eventosData }] = await Promise.all([
    supabase.from("jogos").select("*").gte("data_jogo", inicio).lte("data_jogo", fim).order("data_jogo"),
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

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="calendario-${hojeStr.slice(0, 7)}.pdf"`,
    },
  });
}
