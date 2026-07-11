export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { CredenciamentoDocument, type CredenciamentoPdfItem } from "@/lib/pdf/credenciamento-document";
import type {
  ComissaoTecnicaRow,
  CredenciamentoCatalogoRow,
  CredenciamentoJogoRow,
  JogoRow,
  StaffOperacionalRow,
} from "@/lib/supabase/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoRow;

  const { data: credenciamentoData } = await supabase
    .from("credenciamento_jogo")
    .select("*")
    .eq("jogo_id", params.id);
  const credenciamentos = (credenciamentoData ?? []) as CredenciamentoJogoRow[];
  if (credenciamentos.length === 0) {
    return new NextResponse("Ainda não há credenciamento registrado para este jogo.", { status: 400 });
  }

  const comissaoIds = credenciamentos.filter((c) => c.pessoa_tipo === "comissao").map((c) => c.pessoa_id);
  const staffIds = credenciamentos.filter((c) => c.pessoa_tipo === "staff").map((c) => c.pessoa_id);
  const catalogoIds = Array.from(new Set(credenciamentos.map((c) => c.credenciamento_catalogo_id)));

  const [{ data: comissaoData }, { data: staffData }, { data: catalogoData }, adversarioLogoUrl] = await Promise.all([
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica").select("*").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase.from("staff_operacional").select("*").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    supabase.from("credenciamento_catalogo").select("*").in("id", catalogoIds),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const comissaoMap = new Map(((comissaoData ?? []) as ComissaoTecnicaRow[]).map((c) => [c.id, c.nome_completo]));
  const staffMap = new Map(((staffData ?? []) as StaffOperacionalRow[]).map((s) => [s.id, s.nome_completo]));
  const catalogoMap = new Map(
    ((catalogoData ?? []) as CredenciamentoCatalogoRow[]).map((c) => [c.id, c]),
  );

  const itens: CredenciamentoPdfItem[] = credenciamentos.map((c) => {
    const item = catalogoMap.get(c.credenciamento_catalogo_id);
    const nome =
      (c.pessoa_tipo === "comissao" ? comissaoMap.get(c.pessoa_id) : staffMap.get(c.pessoa_id)) ?? "—";
    return {
      nome,
      tipo: c.pessoa_tipo === "comissao" ? "Comissão Técnica" : "Staff Operacional",
      zona: item?.zona ?? "—",
      funcao: item?.funcao ?? "—",
      vagaExtra: c.vaga_extra,
    };
  });

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <CredenciamentoDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      itens={itens}
    />,
  );

  const nomeArquivo = `credenciamento-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
