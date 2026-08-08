export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CalendarioDocument, type CalendarioPdfItem } from "@/lib/pdf/calendario-document";
import { limitesDoMes, montarItensCalendario } from "@/lib/futebol/calendario";
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

/** Gera o PDF do widget "Calendário" (mês corrente) — ver `app/profissional/calendario-widget.tsx`
 * e a spec do redesign visual. Sem parâmetro de mês por enquanto: sempre o mês corrente, mesmo
 * recorte que a Home mostra (a Home também não navega pra outros meses ainda). */
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
  const itensDoMes = montarItensCalendario(jogos, eventos);

  const itensPdf: CalendarioPdfItem[] = itensDoMes.map((item) =>
    item.tipo === "jogo"
      ? {
          data: item.data,
          horario: item.horario,
          titulo: item.titulo,
          categoria: "jogo",
          detalhe: item.jogo.local_estadio,
        }
      : {
          data: item.data,
          horario: item.horario,
          titulo: item.titulo,
          categoria: item.categoria,
          detalhe: item.evento.observacao,
        },
  );

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <CalendarioDocument
      juventusLogoSrc={juventusLogoSrc}
      mesLabel={`${MESES[mes - 1]} de ${ano}`}
      geradoEm={new Date()}
      itens={itensPdf}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="calendario-${hojeStr.slice(0, 7)}.pdf"`,
    },
  });
}
