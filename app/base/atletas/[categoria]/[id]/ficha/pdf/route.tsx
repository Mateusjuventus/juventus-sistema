export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { formatTelefone } from "@/lib/validation/telefone";
import { formatCEP } from "@/lib/validation/cep";
import { categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { classificacaoAtletaLabel } from "@/lib/futebol/classificacao-atleta";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import {
  CAMPOS_FICHA_ATLETA_BASE,
  camposFichaAtletaDaQueryString,
  construirSecoesFichaAtleta,
  enderecoFichaAtleta,
} from "@/lib/futebol/ficha-atleta";
import { FichaAtletaDocument } from "@/lib/pdf/ficha-atleta-document";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { AtletaBaseContatoEmergenciaRow, AtletaBaseContratoRow, AtletaBaseRow, AtletaBaseStatus } from "@/lib/supabase/types";

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

const STATUS_LABEL: Record<AtletaBaseStatus, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
  dispensado: "Dispensado",
};

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((o) => [o.value, o.label]),
);

function naturalidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || null;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Gera a ficha individual do atleta (Futebol de Base) em PDF — espelha `app/atletas/[id]/ficha/pdf/
 * route.tsx` (Profissional), com os campos que só existem no cadastro da Base (Responsáveis,
 * Categoria, Classificação G1/G2/G3, Agência, Alojamento, Escola). Ver `lib/futebol/ficha-atleta.ts`.
 */
export async function GET(request: Request, { params }: { params: { categoria: string; id: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const url = new URL(request.url);
  const selecionados = camposFichaAtletaDaQueryString(url.searchParams, CAMPOS_FICHA_ATLETA_BASE);

  const supabase = createClient();
  const [{ data: atletaData }, { data: contatosData }, { data: contratosData }] = await Promise.all([
    supabase.from("atletas_base").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_base_contatos_emergencia")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("atleta_base_contratos")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = atletaData as AtletaBaseRow;
  const contatos = (contatosData ?? []) as AtletaBaseContatoEmergenciaRow[];
  const contratos = (contratosData ?? []) as AtletaBaseContratoRow[];
  const vigente = contratos.find((c) => c.vigente) ?? null;

  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${
    atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""
  }`;

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const valorTotalContrato = vigente
    ? vigente.salario_ctps + vigente.direito_imagem + vigente.bonificacao + vigente.auxilio_moradia + vigente.outros
    : 0;
  const percentual = (valor: number) =>
    valorTotalContrato > 0 ? ` (${((valor / valorTotalContrato) * 100).toFixed(1)}%)` : "";

  const responsaveis = [
    atleta.mae_nome
      ? `Mãe: ${[atleta.mae_nome, atleta.mae_telefone ? formatTelefone(atleta.mae_telefone) : null, atleta.email_mae]
          .filter(Boolean)
          .join(" · ")}`
      : null,
    atleta.pai_nome
      ? `Pai: ${[atleta.pai_nome, atleta.pai_telefone ? formatTelefone(atleta.pai_telefone) : null, atleta.email_pai]
          .filter(Boolean)
          .join(" · ")}`
      : null,
  ].filter(Boolean);

  const valores: Record<string, string | null> = {
    nome_completo: atleta.nome_completo,
    apelido: atleta.apelido,
    rg: atleta.rg,
    cpf: atleta.cpf ? formatCPF(atleta.cpf) : null,
    data_nascimento: formatDataBr(atleta.data_nascimento),
    naturalidade: naturalidade(atleta.cidade_natal, atleta.uf_natal),
    telefone: atleta.telefone ? formatTelefone(atleta.telefone) : null,
    email: atleta.email,
    alergia: atleta.possui_alergia_medicamento
      ? `Sim${atleta.alergia_medicamento_qual ? ` — ${atleta.alergia_medicamento_qual}` : ""}`
      : "Não",
    endereco_atual:
      enderecoFichaAtleta({
        logradouro: atleta.logradouro,
        numero: atleta.numero,
        complemento: atleta.complemento,
        bairro: atleta.bairro,
        cidade: atleta.cidade,
        uf: atleta.uf,
        cepFormatado: atleta.cep ? formatCEP(atleta.cep) : null,
      }) ?? atleta.endereco_atual,
    endereco_origem: enderecoFichaAtleta({
      logradouro: atleta.origem_logradouro,
      numero: atleta.origem_numero,
      complemento: atleta.origem_complemento,
      bairro: atleta.origem_bairro,
      cidade: atleta.origem_cidade,
      uf: atleta.origem_uf,
      cepFormatado: atleta.origem_cep ? formatCEP(atleta.origem_cep) : null,
    }),
    responsaveis: responsaveis.length > 0 ? responsaveis.join("; ") : null,
    contato_emergencia:
      contatos.length > 0
        ? contatos.map((c) => [c.nome, c.parentesco, c.contato].filter(Boolean).join(" — ")).join("; ")
        : null,

    categoria: categoriaBaseLabel(atleta.categoria),
    posicao: atleta.posicao,
    numero_camisa: atleta.numero_camisa != null ? String(atleta.numero_camisa) : null,
    numero_cbf: atleta.numero_cbf != null ? String(atleta.numero_cbf) : null,
    pe_dominante: atleta.pe_dominante ? PE_DOMINANTE_LABEL[atleta.pe_dominante] ?? atleta.pe_dominante : null,
    status: STATUS_LABEL[atleta.status],
    classificacao: classificacaoAtletaLabel(atleta.classificacao) ?? "Não classificado",
    data_inicio_clube: formatDataBr(atleta.data_inicio_clube),
    empresario:
      [
        atleta.empresario_nome,
        atleta.empresario_telefone ? formatTelefone(atleta.empresario_telefone) : null,
        atleta.empresario_email,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    agencia: atleta.agencia,
    tamanho_uniforme: atleta.tamanho_uniforme,
    alojamento: `${atleta.alojado ? "Sim" : "Não"}${
      atleta.valor_ajuda_custo != null ? ` — ajuda de custo ${formatMoeda(atleta.valor_ajuda_custo)}` : ""
    }`,
    escola: atleta.escola,

    contrato_tipo: vigente
      ? `${TIPO_CONTRATO_LABEL[vigente.tipo_contrato] ?? vigente.tipo_contrato}${
          vigente.tipo_contrato === "emprestimo" && vigente.clube_origem ? ` — ${vigente.clube_origem}` : ""
        }`
      : null,
    contrato_vigencia: vigente
      ? `${formatDataBr(vigente.vigencia_inicio)} – ${formatDataBr(vigente.vigencia_fim)}`
      : null,
    contrato_salario_ctps: vigente ? `${formatMoeda(vigente.salario_ctps)}${percentual(vigente.salario_ctps)}` : null,
    contrato_direito_imagem: vigente
      ? `${formatMoeda(vigente.direito_imagem)}${percentual(vigente.direito_imagem)}`
      : null,
    contrato_bonificacao: vigente ? `${formatMoeda(vigente.bonificacao)}${percentual(vigente.bonificacao)}` : null,
    contrato_auxilio_moradia: vigente
      ? `${formatMoeda(vigente.auxilio_moradia)}${percentual(vigente.auxilio_moradia)}`
      : null,
    contrato_outros: vigente ? `${formatMoeda(vigente.outros)}${percentual(vigente.outros)}` : null,
    contrato_valor_total: vigente ? formatMoeda(valorTotalContrato) : null,
  };

  const secoes = construirSecoesFichaAtleta(CAMPOS_FICHA_ATLETA_BASE, selecionados, valores, !!vigente);

  const buffer = await renderToBuffer(
    <FichaAtletaDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      nome={atleta.nome_completo}
      subtitulo={subtitulo}
      secoes={secoes}
    />,
  );

  const nomeArquivo = `ficha-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
