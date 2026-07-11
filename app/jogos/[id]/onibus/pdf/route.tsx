export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { OnibusDocument, type OnibusPdfItem } from "@/lib/pdf/onibus-document";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  JogoRow,
  OnibusListaRow,
  OnibusPassageiroRow,
  StaffOperacionalRow,
} from "@/lib/supabase/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoRow;

  const { data: onibusData } = await supabase
    .from("onibus_lista")
    .select("*")
    .eq("jogo_id", params.id)
    .order("onibus_numero", { ascending: true });
  const onibusRows = (onibusData ?? []) as OnibusListaRow[];
  if (onibusRows.length === 0) {
    return new NextResponse("Ainda não há ônibus registrado para este jogo.", { status: 400 });
  }
  const onibusIds = onibusRows.map((o) => o.id);

  const { data: passageirosData } = await supabase
    .from("onibus_passageiros")
    .select("*")
    .in("onibus_lista_id", onibusIds);
  const passageiros = (passageirosData ?? []) as OnibusPassageiroRow[];

  const atletaIds = passageiros.filter((p) => p.pessoa_tipo === "atleta").map((p) => p.pessoa_id);
  const comissaoIds = passageiros.filter((p) => p.pessoa_tipo === "comissao").map((p) => p.pessoa_id);
  const staffIds = passageiros.filter((p) => p.pessoa_tipo === "staff").map((p) => p.pessoa_id);

  const [{ data: atletasData }, { data: comissaoData }, { data: staffData }, adversarioLogoUrl] =
    await Promise.all([
      atletaIds.length > 0 ? supabase.from("atletas").select("*").in("id", atletaIds) : Promise.resolve({ data: [] }),
      comissaoIds.length > 0
        ? supabase.from("comissao_tecnica").select("*").in("id", comissaoIds)
        : Promise.resolve({ data: [] }),
      staffIds.length > 0
        ? supabase.from("staff_operacional").select("*").in("id", staffIds)
        : Promise.resolve({ data: [] }),
      getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
    ]);

  const atletaMap = new Map(((atletasData ?? []) as AtletaRow[]).map((a) => [a.id, a.nome_completo]));
  const comissaoMap = new Map(((comissaoData ?? []) as ComissaoTecnicaRow[]).map((c) => [c.id, c.nome_completo]));
  const staffMap = new Map(((staffData ?? []) as StaffOperacionalRow[]).map((s) => [s.id, s.nome_completo]));

  const nomeDe = (p: OnibusPassageiroRow): string => {
    if (p.pessoa_tipo === "atleta") return atletaMap.get(p.pessoa_id) ?? "—";
    if (p.pessoa_tipo === "comissao") return comissaoMap.get(p.pessoa_id) ?? "—";
    return staffMap.get(p.pessoa_id) ?? "—";
  };

  const onibusPdf: OnibusPdfItem[] = onibusRows.map((o) => ({
    numero: o.onibus_numero,
    horario: o.horario_saida ? o.horario_saida.slice(0, 5) : null,
    passageiros: passageiros.filter((p) => p.onibus_lista_id === o.id).map(nomeDe),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <OnibusDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      onibus={onibusPdf}
    />,
  );

  const nomeArquivo = `onibus-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
