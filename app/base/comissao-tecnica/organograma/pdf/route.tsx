export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { OrganogramaBaseDocument, type OrganogramaBaseNoDocumento } from "@/lib/pdf/organograma-base-document";
import type { ComissaoTecnicaBaseRow, OrganogramaBaseRow } from "@/lib/supabase/types";

/** PDF do Organograma da Base — mesma resolução de nome/cargo (pessoa vinculada > texto livre >
 * "???") da tela (`app/base/comissao-tecnica/organograma/page.tsx`), mesma logo usada nos outros
 * documentos oficiais do sistema (`public/brand/juventus-escudo-mark.png`). */
export async function GET() {
  const supabase = createClient();

  const [{ data: nosData }, { data: pessoasData }] = await Promise.all([
    supabase.from("organograma_base").select("*").order("ordem", { ascending: true }),
    supabase.from("comissao_tecnica_base").select("id, nome_completo, funcao"),
  ]);

  const nosBrutos = (nosData ?? []) as OrganogramaBaseRow[];
  if (nosBrutos.length === 0) {
    return new NextResponse("Adicione ao menos uma caixa ao Organograma da Base antes de gerar o PDF.", {
      status: 400,
    });
  }

  const pessoas = (pessoasData ?? []) as Pick<ComissaoTecnicaBaseRow, "id" | "nome_completo" | "funcao">[];
  const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));

  const nos: OrganogramaBaseNoDocumento[] = nosBrutos.map((n) => {
    const pessoa = n.comissao_tecnica_base_id ? pessoaPorId.get(n.comissao_tecnica_base_id) : undefined;
    return {
      id: n.id,
      nomeExibido: pessoa?.nome_completo ?? n.nome ?? "???",
      cargoExibido: pessoa?.funcao ?? n.cargo ?? "",
      grupo: n.grupo,
      linha: n.linha,
      reportaPara: n.reporta_para,
      ordem: n.ordem,
      posX: n.pos_x,
      posY: n.pos_y,
      posManual: n.pos_manual,
    };
  });

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <OrganogramaBaseDocument juventusLogoSrc={juventusLogoSrc} geradoEm={new Date()} nos={nos} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="organograma-futebol-de-base.pdf"',
    },
  });
}
