export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { ReciboConsolidadoDocument, type ReciboPdfItem } from "@/lib/pdf/recibo-document";
import type { ComissaoTecnicaBaseRow, JogoBaseRow, ReciboJogoBaseRow, StaffOperacionalBaseRow } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/recibo/pdf-consolidado/route.tsx` para o Futebol de Base. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoBaseRow;

  const { data: recibosData } = await supabase
    .from("recibos_jogo_base")
    .select("*")
    .eq("jogo_id", params.id)
    .not("valor", "is", null);
  const recibos = (recibosData ?? []) as ReciboJogoBaseRow[];
  if (recibos.length === 0) {
    return new NextResponse("Ainda não há recibos com valor preenchido para este jogo.", { status: 400 });
  }

  const comissaoIds = recibos.filter((r) => r.pessoa_tipo === "comissao").map((r) => r.pessoa_id);
  const staffIds = recibos.filter((r) => r.pessoa_tipo === "staff").map((r) => r.pessoa_id);

  const [{ data: comissaoData }, { data: staffData }, adversarioLogoUrl] = await Promise.all([
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica_base").select("*").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase.from("staff_operacional_base").select("*").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const comissaoMap = new Map(((comissaoData ?? []) as ComissaoTecnicaBaseRow[]).map((c) => [c.id, c.nome_completo]));
  const staffMap = new Map(((staffData ?? []) as StaffOperacionalBaseRow[]).map((s) => [s.id, s.nome_completo]));

  const itens: ReciboPdfItem[] = recibos.map((r) => ({
    nome: (r.pessoa_tipo === "comissao" ? comissaoMap.get(r.pessoa_id) : staffMap.get(r.pessoa_id)) ?? "—",
    tipo: r.pessoa_tipo === "comissao" ? "Comissão Técnica" : "Staff Operacional",
    funcaoJogo: r.funcao_jogo,
    valor: r.valor,
    chavePix: null,
    pago: r.pago,
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <ReciboConsolidadoDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      itens={itens}
    />,
  );

  const nomeArquivo = `recibo-consolidado-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
