export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import { descricaoVeiculo, formatPlaca, ordenarPorCondutor } from "@/lib/futebol/veiculo";
import {
  VeiculosLiberacaoDocument,
  type VeiculoLiberacaoPdf,
} from "@/lib/pdf/veiculos-liberacao-document";
import type { VeiculoRow } from "@/lib/supabase/types";

/**
 * Relação de Placas, gerada sob demanda a partir dos veículos escolhidos na tela
 * (`/veiculos/documento`). Os ids vêm na query string porque a tela é um `form method="get"` — o
 * documento não é gravado em lugar nenhum (ver o comentário em `documento-form.tsx`).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = params.getAll("ids").filter(Boolean);
  if (ids.length === 0) {
    return new NextResponse("Selecione ao menos um veículo para gerar o documento.", { status: 400 });
  }

  const supabase = createClient();
  const { data } = await supabase.from("veiculos").select("*").in("id", ids);
  const veiculos = (data ?? []) as VeiculoRow[];
  if (veiculos.length === 0) {
    return new NextResponse("Nenhum dos veículos selecionados foi encontrado.", { status: 404 });
  }

  // Ordem alfabética do condutor — é como a portaria confere a lista, não a ordem de clique.
  const linhas: VeiculoLiberacaoPdf[] = ordenarPorCondutor(veiculos).map((v) => ({
    nome: v.nome,
    documento: v.documento,
    placa: formatPlaca(v.placa),
    veiculo: descricaoVeiculo(v),
    telefone: v.telefone,
  }));

  const texto = (campo: string): string | null => {
    const valor = (params.get(campo) ?? "").trim();
    return valor === "" ? null : valor;
  };

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <VeiculosLiberacaoDocument
      juventusLogoSrc={juventusLogoSrc}
      emitidoEm={hojeBrasilia()}
      dados={{
        evento: texto("evento"),
        data: texto("data"),
        horario: texto("horario"),
        local: texto("local"),
        observacoes: texto("observacoes"),
        responsavelNome: texto("responsavelNome"),
        responsavelFuncao: texto("responsavelFuncao"),
      }}
      veiculos={linhas}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relacao-de-placas-${hojeBrasilia()}.pdf"`,
    },
  });
}
