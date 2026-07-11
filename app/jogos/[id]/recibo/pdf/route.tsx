export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ReciboIndividualDocument, type ReciboPdfItem } from "@/lib/pdf/recibo-document";
import type { ComissaoTecnicaRow, JogoRow, ReciboJogoRow, StaffOperacionalRow } from "@/lib/supabase/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoRow;

  const { data: recibosData } = await supabase
    .from("recibos_jogo")
    .select("*")
    .eq("jogo_id", params.id)
    .not("valor", "is", null);
  const recibos = (recibosData ?? []) as ReciboJogoRow[];
  if (recibos.length === 0) {
    return new NextResponse("Ainda não há recibos com valor preenchido para este jogo.", { status: 400 });
  }

  const comissaoIds = recibos.filter((r) => r.pessoa_tipo === "comissao").map((r) => r.pessoa_id);
  const staffIds = recibos.filter((r) => r.pessoa_tipo === "staff").map((r) => r.pessoa_id);

  const [{ data: comissaoData }, { data: staffData }] = await Promise.all([
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica").select("*").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase.from("staff_operacional").select("*").in("id", staffIds)
      : Promise.resolve({ data: [] }),
  ]);

  const comissaoMap = new Map(((comissaoData ?? []) as ComissaoTecnicaRow[]).map((c) => [c.id, c]));
  const staffMap = new Map(((staffData ?? []) as StaffOperacionalRow[]).map((s) => [s.id, s]));

  const itens: ReciboPdfItem[] = recibos.map((r) => {
    const pessoa = r.pessoa_tipo === "comissao" ? comissaoMap.get(r.pessoa_id) : staffMap.get(r.pessoa_id);
    return {
      nome: pessoa?.nome_completo ?? "—",
      tipo: r.pessoa_tipo === "comissao" ? "Comissão Técnica" : "Staff Operacional",
      dataNascimento: pessoa?.data_nascimento ?? "",
      cpf: pessoa?.cpf ?? "",
      rg: pessoa?.rg ?? "",
      funcaoJogo: r.funcao_jogo,
      valor: r.valor,
      chavePix: r.chave_pix,
      chavePixTipo: r.chave_pix_tipo,
      pago: r.pago,
    };
  });

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <ReciboIndividualDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      itens={itens}
      geradoEm={new Date()}
    />,
  );

  const nomeArquivo = `recibos-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
