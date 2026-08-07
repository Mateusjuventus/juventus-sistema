export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import {
  RoomingListEnvioDocument,
  type RoomingListEnvioOcupante,
  type RoomingListEnvioQuarto,
} from "@/lib/pdf/rooming-list-envio-document";
import { parseOrdemApartamento } from "@/lib/pdf/logistica-shared";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  JogoRow,
  RoomingListOcupanteRow,
  RoomingListQuartoRow,
  RoomingListRow,
  StaffOperacionalRow,
} from "@/lib/supabase/types";

/** Versão para enviar a atletas/comissão técnica — mesmos dados de `pdf/route.tsx`, mas sem CPF,
 * RG e data de nascimento (só interessam à operação interna do clube). */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ordemAtletas = parseOrdemApartamento(new URL(request.url).searchParams.get("ordemAtletas"));

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

  const atletaIds = ocupantes.filter((o) => o.pessoa_tipo === "atleta").map((o) => o.pessoa_id);
  const comissaoIds = ocupantes.filter((o) => o.pessoa_tipo === "comissao").map((o) => o.pessoa_id);
  const staffIds = ocupantes.filter((o) => o.pessoa_tipo === "staff").map((o) => o.pessoa_id);

  const [{ data: atletasData }, { data: comissaoData }, { data: staffData }, adversarioLogoUrl] = await Promise.all([
    atletaIds.length > 0
      ? supabase.from("atletas").select("id, nome_completo, apelido").in("id", atletaIds)
      : Promise.resolve({ data: [] }),
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica").select("id, nome_completo").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase.from("staff_operacional").select("id, nome_completo").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const atletaMap = new Map(
    ((atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "apelido">[]).map((a) => [a.id, a]),
  );
  const comissaoMap = new Map(
    ((comissaoData ?? []) as Pick<ComissaoTecnicaRow, "id" | "nome_completo">[]).map((c) => [c.id, c]),
  );
  const staffMap = new Map(
    ((staffData ?? []) as Pick<StaffOperacionalRow, "id" | "nome_completo">[]).map((s) => [s.id, s]),
  );

  const pessoaDe = (o: RoomingListOcupanteRow): RoomingListEnvioOcupante => {
    // Atleta: prioriza o apelido (como ele é conhecido no dia a dia) sobre o nome completo — pedido
    // do usuário, só pra atletas (Comissão Técnica e Staff continuam com nome completo).
    if (o.pessoa_tipo === "atleta") {
      const atleta = atletaMap.get(o.pessoa_id);
      return { nome: atleta?.apelido || atleta?.nome_completo || "—", tipo: o.pessoa_tipo };
    }
    const registro = o.pessoa_tipo === "comissao" ? comissaoMap.get(o.pessoa_id) : staffMap.get(o.pessoa_id);
    return { nome: registro?.nome_completo ?? "—", tipo: o.pessoa_tipo };
  };

  const quartosPdf: RoomingListEnvioQuarto[] = quartos.map((q, i) => ({
    numero: i + 1,
    numeroApartamento: q.numero_apartamento,
    ocupantes: ocupantes.filter((o) => o.quarto_id === q.id).map(pessoaDe),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RoomingListEnvioDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      hotelNome={roomingList.hotel_nome}
      hotelEndereco={roomingList.hotel_endereco}
      checkin={roomingList.checkin}
      checkout={roomingList.checkout}
      quartos={quartosPdf}
      ordemAtletas={ordemAtletas}
    />,
  );

  const nomeArquivo = `rooming-list-envio-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
