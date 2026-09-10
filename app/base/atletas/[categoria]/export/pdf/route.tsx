export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import {
  atletaPassaFiltro,
  camposOcultosDaQueryString,
  filtrosDaQueryString,
  mostrarInativosDaQueryString,
} from "@/lib/futebol/atletas-filtro";
import { AtletasResumoDocument, type AtletaResumoPdfItem } from "@/lib/pdf/atletas-resumo-document";
import type { AtletaBaseRow, AtletaBaseStatus } from "@/lib/supabase/types";

// Mesmos rótulos "Apto"/"Não apto"/"Depto. Médico"/"Dispensado" de `app/base/atletas/[categoria]/
// page.tsx` (ver item 7 do ajuste de 2026-09-10) — o resumo do PDF precisa bater com o que a tela
// mostra.
const STATUS_LABEL: Record<AtletaBaseStatus, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
  dispensado: "Dispensado",
};

const STATUS_OPTIONS = [
  { value: "liberado", label: STATUS_LABEL.liberado },
  { value: "suspenso", label: STATUS_LABEL.suspenso },
  { value: "departamento_medico", label: STATUS_LABEL.departamento_medico },
  { value: "dispensado", label: STATUS_LABEL.dispensado },
];

const CONTRATO_OPTIONS_BASE = ["definitivo", "emprestimo", "amador", "formacao", "iniciacao"] as const;

/**
 * PDF "Resumo de Atletas" da Base — espelha `app/atletas/export/pdf/route.tsx`, filtrado pela
 * categoria da URL e respeitando os mesmos filtros de Status/Posição/Contrato, busca por nome e
 * "Mostrar inativos" ativos na tela (mesmo princípio do "Exportar para Excel" da Base).
 */
export async function GET(request: NextRequest, { params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const { searchParams } = new URL(request.url);
  const filtros = filtrosDaQueryString(searchParams);
  const mostrarInativos = mostrarInativosDaQueryString(searchParams);
  const camposOcultos = camposOcultosDaQueryString(searchParams);
  const supabase = createClient();

  const { data } = await supabase
    .from("atletas_base")
    .select("*")
    .eq("categoria", categoria)
    .order("nome_completo", { ascending: true });
  const atletas = ((data ?? []) as AtletaBaseRow[]).filter((a) =>
    atletaPassaFiltro(
      { status: a.status, posicao: a.posicao, tipoContrato: a.tipo_contrato, nome: a.nome_completo },
      filtros,
      mostrarInativos ? undefined : "dispensado",
    ),
  );

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: AtletaResumoPdfItem[] = atletas.map((a, i) => ({
    id: a.id,
    nome: a.nome_completo,
    apelido: a.apelido,
    cpf: a.cpf ? formatCPF(a.cpf) : null,
    fotoUrl: fotoUrls[i],
    dataNascimento: a.data_nascimento,
    dataFimContrato: a.data_fim_contrato,
    tipoContrato: a.tipo_contrato,
    posicao: a.posicao,
    numeroCamisa: a.numero_camisa,
    dispensado: a.status === "dispensado",
    status: a.status,
  }));

  const juventusLogoSrc = {
    data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo-mark.png")),
    format: "png" as const,
  };

  const buffer = await renderToBuffer(
    <AtletasResumoDocument
      titulo={`Atletas — ${categoriaBaseLabel(categoria)}`}
      atletas={itens}
      contratoOptions={[...CONTRATO_OPTIONS_BASE]}
      statusOptions={STATUS_OPTIONS}
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      mostrarCpf={!camposOcultos.has("cpf")}
      mostrarContrato={!camposOcultos.has("contrato")}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="atletas-base-${categoria}.pdf"`,
    },
  });
}
