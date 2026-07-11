export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { RoomingListDocument, type RoomingListPdfQuarto } from "@/lib/pdf/rooming-list-document";
import type {
  ComissaoTecnicaRow,
  JogoRow,
  RoomingListOcupanteRow,
  RoomingListQuartoRow,
  RoomingListRow,
  StaffOperacionalRow,
} from "@/lib/supabase/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoRow;

  const { data: roomingListData } = await supabase
    .from("rooming_list")
    .select("*")
    .eq("jogo_id", params.id)
    .maybeSingle();
  if (!roomingListData) {
    return new NextResponse("Ainda não há rooming list registrada para este jogo.", { status: 400 });
  }
  const roomingList = roomingListData as RoomingListRow;

  const { data: quartosData } = await supabase
    .from("rooming_list_quartos")
    .select("*")
    .eq("rooming_list_id", roomingList.id)
    .order("ordem", { ascending: true });
  const quartos = (quartosData ?? []) as RoomingListQuartoRow[];
  const quartoIds = quartos.map((q) => q.id);

  let ocupantes: RoomingListOcupanteRow[] = [];
  if (quartoIds.length > 0) {
    const { data: ocupantesData } = await supabase
      .from("rooming_list_ocupantes")
      .select("*")
      .in("quarto_id", quartoIds);
    ocupantes = (ocupantesData ?? []) as RoomingListOcupanteRow[];
  }

  const comissaoIds = ocupantes.filter((o) => o.pessoa_tipo === "comissao").map((o) => o.pessoa_id);
  const staffIds = ocupantes.filter((o) => o.pessoa_tipo === "staff").map((o) => o.pessoa_id);

  const [{ data: comissaoData }, { data: staffData }, adversarioLogoUrl] = await Promise.all([
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica").select("*").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase.from("staff_operacional").select("*").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const comissaoMap = new Map(((comissaoData ?? []) as ComissaoTecnicaRow[]).map((c) => [c.id, c.nome_completo]));
  const staffMap = new Map(((staffData ?? []) as StaffOperacionalRow[]).map((s) => [s.id, s.nome_completo]));

  const nomeDe = (o: RoomingListOcupanteRow): string =>
    (o.pessoa_tipo === "comissao" ? comissaoMap.get(o.pessoa_id) : staffMap.get(o.pessoa_id)) ?? "—";

  const quartosPdf: RoomingListPdfQuarto[] = quartos.map((q, i) => ({
    numero: i + 1,
    tipo: q.tipo,
    ocupantes: ocupantes.filter((o) => o.quarto_id === q.id).map(nomeDe),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RoomingListDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      hotelNome={roomingList.hotel_nome}
      hotelEndereco={roomingList.hotel_endereco}
      checkin={roomingList.checkin}
      checkout={roomingList.checkout}
      quartos={quartosPdf}
    />,
  );

  const nomeArquivo = `rooming-list-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
