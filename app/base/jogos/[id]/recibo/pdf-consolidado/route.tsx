export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { ReciboConsolidadoDocument, type ReciboPdfItem } from "@/lib/pdf/recibo-document";
import { funcaoCadastroStaff } from "@/lib/futebol/funcao-staff";
import type { JogoBaseRow, ReciboJogoBaseRow, StaffOperacionalBaseComFuncaoRow } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/recibo/pdf-consolidado/route.tsx` para o Futebol de Base. Recibo de
 * Pagamento é só pra Staff Operacional — o filtro `pessoa_tipo=staff` também protege contra
 * registros antigos de Comissão Técnica que possam ter ficado no banco de antes dessa mudança. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoBaseRow;

  const { data: recibosData } = await supabase
    .from("recibos_jogo_base")
    .select("*")
    .eq("jogo_id", params.id)
    .eq("pessoa_tipo", "staff");
  const recibos = (recibosData ?? []) as ReciboJogoBaseRow[];
  if (recibos.length === 0) {
    return new NextResponse("Ainda não há ninguém marcado como incluído neste jogo.", { status: 400 });
  }

  const staffIds = recibos.map((r) => r.pessoa_id);

  const [{ data: staffData }, adversarioLogoUrl] = await Promise.all([
    staffIds.length > 0
      ? supabase
          .from("staff_operacional_base")
          .select(
            "*, funcao:staff_funcoes_catalogo!staff_operacional_base_funcao_id_fkey(nome), funcao_terceirizada:staff_funcoes_catalogo!staff_operacional_base_funcao_terceirizada_id_fkey(nome)",
          )
          .in("id", staffIds)
      : Promise.resolve({ data: [] }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const staffMap = new Map(((staffData ?? []) as StaffOperacionalBaseComFuncaoRow[]).map((s) => [s.id, s]));

  const itens: ReciboPdfItem[] = recibos.map((r) => {
    const pessoa = staffMap.get(r.pessoa_id);
    return {
      nome: pessoa?.nome_completo ?? "—",
      tipo: "Staff Operacional",
      funcaoJogo: r.funcao_jogo ?? (pessoa ? funcaoCadastroStaff(pessoa) : null),
      valor: r.valor,
      chavePix: null,
      pago: r.pago,
    };
  });

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
