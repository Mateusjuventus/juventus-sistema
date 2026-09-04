export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  RelacaoAtletasBaseDocument,
  type RelacaoAtletaLinha,
  type RelacaoAtletasColunas,
} from "@/lib/pdf/relacao-atletas-base-document";
import {
  agruparAtletasPorCategoria,
  categoriasParaFiltro,
  composicaoEscopoCategorias,
  RELACAO_STATUS_LABEL,
  statusParaFiltro,
} from "@/lib/futebol/relacao-atletas-base";
import { classificacaoAtletaLabel } from "@/lib/futebol/classificacao-atleta";
import { ehCategoriaBaseValida, TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaBaseRow, AtletaBaseStatus } from "@/lib/supabase/types";

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

function naturalidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) return `${cidade}/${uf}`;
  if (cidade) return cidade;
  if (uf) return uf;
  return null;
}

function numeroRegistro(cbf: number | null, fpf: number | null): string | null {
  const partes = [cbf != null ? `CBF ${cbf}` : null, fpf != null ? `FPF ${fpf}` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

const TODOS_STATUS_KEYS: { key: string; status: AtletaBaseStatus }[] = [
  { key: "status_liberado", status: "liberado" },
  { key: "status_suspenso", status: "suspenso" },
  { key: "status_departamento_medico", status: "departamento_medico" },
  { key: "status_dispensado", status: "dispensado" },
];

/**
 * PDF da Relação de Atletas da Base (ver docs/superpowers/specs/2026-09-04-relacao-atletas-base-
 * design.md) — mesmo padrão de submissão do Relatório Avulso (`app/base/relatorios/avulso/pdf/
 * route.tsx`): POST simples de formulário (sem Server Action), lê tudo do `FormData`, abre o PDF
 * numa aba nova.
 */
export async function POST(request: Request) {
  const formData = await request.formData();

  const categoriasMarcadas = formData
    .getAll("categorias")
    .map((valor) => String(valor))
    .filter(ehCategoriaBaseValida);
  const categoriasFiltro = categoriasParaFiltro(categoriasMarcadas);

  const statusMarcados = TODOS_STATUS_KEYS.filter(({ key }) => formData.get(key) === "on").map((s) => s.status);
  const statusFiltro = statusParaFiltro(statusMarcados);

  const colunas: RelacaoAtletasColunas = {
    apelido: formData.get("colApelido") === "on",
    nascimento: formData.get("colNascimento") === "on",
    cpf: formData.get("colCpf") === "on",
    rg: formData.get("colRg") === "on",
    telefone: formData.get("colTelefone") === "on",
    posicao: formData.get("colPosicao") === "on",
    numeroCamisa: formData.get("colNumeroCamisa") === "on",
    numeroRegistro: formData.get("colNumeroRegistro") === "on",
    peDominante: formData.get("colPeDominante") === "on",
    naturalidade: formData.get("colNaturalidade") === "on",
    endereco: formData.get("colEndereco") === "on",
    dataInicioClube: formData.get("colDataInicioClube") === "on",
    tipoContrato: formData.get("colTipoContrato") === "on",
    dataFimContrato: formData.get("colDataFimContrato") === "on",
    contratoFormacao: formData.get("colContratoFormacao") === "on",
    empresarioNome: formData.get("colEmpresarioNome") === "on",
    status: formData.get("colStatus") === "on",
    classificacao: formData.get("colClassificacao") === "on",
  };

  const supabase = createClient();

  const { data } = await supabase
    .from("atletas_base")
    .select("*")
    .in("status", statusFiltro)
    .in("categoria", categoriasFiltro)
    .order("nome_completo", { ascending: true });

  const atletas: RelacaoAtletaLinha[] = ((data ?? []) as AtletaBaseRow[]).map((a) => ({
    categoria: a.categoria,
    nome: a.nome_completo,
    apelido: a.apelido,
    dataNascimento: a.data_nascimento,
    cpf: a.cpf,
    rg: a.rg,
    telefone: a.telefone,
    posicao: a.posicao,
    numeroCamisa: a.numero_camisa,
    numeroRegistro: numeroRegistro(a.numero_cbf, a.numero_fpf),
    peDominante: a.pe_dominante ? PE_DOMINANTE_LABEL[a.pe_dominante] ?? a.pe_dominante : null,
    naturalidade: naturalidade(a.cidade_natal, a.uf_natal),
    endereco: a.endereco_atual,
    dataInicioClube: a.data_inicio_clube,
    tipoContrato: a.tipo_contrato
      ? ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === a.tipo_contrato)?.label ?? a.tipo_contrato
      : null,
    dataFimContrato: a.data_fim_contrato,
    contratoFormacao: a.tipo_contrato === "amador" ? a.possui_contrato_formacao : null,
    empresarioNome: a.empresario_nome,
    status: RELACAO_STATUS_LABEL[a.status] ?? a.status,
    classificacao: classificacaoAtletaLabel(a.classificacao),
  }));

  const grupos = agruparAtletasPorCategoria(atletas, categoriasFiltro);

  const escopoTexto = composicaoEscopoCategorias(categoriasFiltro);

  // `juventus-escudo.png` (com as estrelas) — pedido do Mateus, não a `-mark` (sem estrelas) que o
  // Avulso usa.
  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelacaoAtletasBaseDocument
      juventusLogoSrc={juventusLogoSrc}
      escopoTexto={escopoTexto}
      grupos={grupos}
      colunas={colunas}
      geradoEm={new Date()}
    />,
  );

  const sufixoArquivo = categoriasFiltro.length === TODAS_CATEGORIAS_BASE.length ? "todas" : categoriasFiltro.join("-");
  const nomeArquivo = `relacao-atletas-${sufixoArquivo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
