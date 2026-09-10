export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { atletaPassaFiltro, filtrosDaQueryString } from "@/lib/futebol/atletas-filtro";
import { AtletasResumoDocument, type AtletaResumoPdfItem } from "@/lib/pdf/atletas-resumo-document";
import type { AtletaRow, AtletaStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// Mesmos rótulos "Apto"/"Não apto"/"Depto. Médico" de `app/atletas/page.tsx` (ver item 7 do ajuste
// de 2026-09-10) — o resumo do PDF precisa bater com o que a tela mostra.
const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
};

const STATUS_OPTIONS = [
  { value: "liberado", label: STATUS_LABEL.liberado },
  { value: "suspenso", label: STATUS_LABEL.suspenso },
  { value: "departamento_medico", label: STATUS_LABEL.departamento_medico },
];

const CONTRATO_OPTIONS_PROFISSIONAL = ["definitivo", "emprestimo", "amador", "formacao"] as const;

/**
 * PDF "Resumo de Atletas" do Profissional — resumo (Status/Posições/Contrato) + os cards dos
 * atletas, tudo numa folha só (ver `lib/pdf/atletas-resumo-document.tsx`), respeitando os mesmos
 * filtros de Status/Posição/Contrato e busca por nome ativos na tela (mesmo princípio do "Exportar
 * para Excel": o PDF sai com exatamente o que está filtrado na tela).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filtros = filtrosDaQueryString(searchParams);
  const supabase = createClient();

  const { data } = await supabase.from("atletas").select("*").order("nome_completo", { ascending: true });
  const atletas = ((data ?? []) as AtletaRow[]).filter((a) =>
    atletaPassaFiltro(
      { status: a.status, posicao: a.posicao, tipoContrato: a.tipo_contrato, nome: a.nome_completo },
      filtros,
    ),
  );

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: AtletaResumoPdfItem[] = atletas.map((a, i) => ({
    id: a.id,
    nome: a.nome_completo,
    cpf: a.cpf ? formatCPF(a.cpf) : null,
    fotoUrl: fotoUrls[i],
    dataNascimento: a.data_nascimento,
    dataFimContrato: a.data_fim_contrato,
    tipoContrato: a.tipo_contrato,
    posicao: a.posicao,
    numeroCamisa: a.numero_camisa,
    dispensado: false,
    status: a.status,
  }));

  const juventusLogoSrc = {
    data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo-mark.png")),
    format: "png" as const,
  };

  const buffer = await renderToBuffer(
    <AtletasResumoDocument
      titulo="Atletas — Profissional"
      atletas={itens}
      contratoOptions={[...CONTRATO_OPTIONS_PROFISSIONAL]}
      statusOptions={STATUS_OPTIONS}
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="atletas.pdf"',
    },
  });
}
