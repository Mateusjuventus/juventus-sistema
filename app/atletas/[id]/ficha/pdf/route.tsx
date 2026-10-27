export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { formatTelefone } from "@/lib/validation/telefone";
import { formatCEP } from "@/lib/validation/cep";
import { ATLETA_STATUS_LABEL } from "@/lib/futebol/fisioterapia";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import {
  CAMPOS_FICHA_ATLETA_PROFISSIONAL,
  camposFichaAtletaDaQueryString,
  construirSecoesFichaAtleta,
  enderecoFichaAtleta,
  extrasFichaAtletaDaQueryString,
  textoFiltroCompeticaoAtleta,
} from "@/lib/futebol/ficha-atleta";
import { buscarEstatisticasAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { montarHistoricoAtleta } from "@/lib/futebol/anotacoes-atleta";
import { FichaAtletaDocument, type FichaAtletaAnotacaoItem, type FichaAtletaDadosDeJogo } from "@/lib/pdf/ficha-atleta-document";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { AtletaAnotacaoRow, AtletaContatoEmergenciaRow, AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";

const TABELAS_JOGO = {
  jogos: "jogos",
  convocacoes: "convocacoes",
  convocacaoAtletas: "convocacao_atletas",
  sumulas: "sumulas",
  sumulaEventos: "sumula_eventos",
  competicaoJogos: "competicao_jogos",
  competicoes: "competicoes",
  temporadas: "temporadas",
};

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_TIPO_CONTRATO_OPTIONS.map((o) => [o.value, o.label]),
);

function naturalidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || null;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Gera a ficha individual do atleta (Futebol Profissional) em PDF, com os campos marcados no modal
 * de geração (`?campos=...`, ver `lib/futebol/ficha-atleta.ts` e
 * `components/atletas/ficha-atleta-modal.tsx`). Sem o parâmetro, sai a ficha completa — mesmo
 * padrão de `app/atletas/[id]/relatorio/pdf/route.tsx`. Pedido do Mateus em 2026-10-22: "gerar a
 * ficha do atleta" com "a opção de eu selecionar quais dados que eu quero que apareça".
 *
 * Ficha "mestre" (ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md):
 * além dos campos de sempre, inclui opcionalmente Dados de Jogo (com gráfico de participação,
 * ?incluirDadosDeJogo=nao pra tirar, ?de=/&ate= pra filtrar período) e Anotações (histórico com
 * autor/data, ?incluirAnotacoes=nao pra tirar).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url);
  const selecionados = camposFichaAtletaDaQueryString(url.searchParams, CAMPOS_FICHA_ATLETA_PROFISSIONAL);
  const extras = extrasFichaAtletaDaQueryString(url.searchParams);

  const supabase = createClient();
  const [{ data: atletaData }, { data: contatosData }, { data: contratosData }, { data: anotacoesData }] =
    await Promise.all([
      supabase.from("atletas").select("*").eq("id", params.id).single(),
      supabase
        .from("atleta_contatos_emergencia")
        .select("*")
        .eq("atleta_id", params.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("atleta_contratos")
        .select("*")
        .eq("atleta_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("atleta_anotacoes")
        .select("*")
        .eq("atleta_id", params.id)
        .order("created_at", { ascending: false }),
    ]);
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = atletaData as AtletaRow;
  const contatos = (contatosData ?? []) as AtletaContatoEmergenciaRow[];
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const anotacoes = (anotacoesData ?? []) as AtletaAnotacaoRow[];
  const vigente = contratos.find((c) => c.vigente) ?? null;

  const dadosDeJogo: FichaAtletaDadosDeJogo | null = extras.dadosDeJogo
    ? await (async () => {
        const { stats, duracaoReferencia, detalhePorCompeticao } = await buscarEstatisticasAtleta(
          supabase,
          atleta.id,
          TABELAS_JOGO,
          { competicaoIds: extras.competicaoIds, incluirSemCompeticao: extras.incluirSemCompeticao },
        );
        const periodoTexto = textoFiltroCompeticaoAtleta(
          extras.competicaoIds,
          detalhePorCompeticao.map((g) => g.titulo),
        );
        return { periodoTexto, stats, duracaoReferencia, detalhePorCompeticao };
      })()
    : null;

  const anotacoesPdf: FichaAtletaAnotacaoItem[] | null = extras.anotacoes
    ? montarHistoricoAtleta(anotacoes).map((item) => ({
        tipo: item.tipo,
        texto: item.texto,
        autor: item.autor ?? "—",
        dataTexto: formatDataHora(item.data),
      }))
    : null;

  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const valorTotalContrato = vigente
    ? vigente.salario_ctps + vigente.direito_imagem + vigente.bonificacao + vigente.auxilio_moradia + vigente.outros
    : 0;
  const percentual = (valor: number) =>
    valorTotalContrato > 0 ? ` (${((valor / valorTotalContrato) * 100).toFixed(1)}%)` : "";

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
    contato_emergencia:
      contatos.length > 0
        ? contatos.map((c) => [c.nome, c.parentesco, c.contato].filter(Boolean).join(" — ")).join("; ")
        : null,

    posicao: atleta.posicao,
    numero_camisa: atleta.numero_camisa != null ? String(atleta.numero_camisa) : null,
    numero_cbf: atleta.numero_cbf != null ? String(atleta.numero_cbf) : null,
    pe_dominante: atleta.pe_dominante ? PE_DOMINANTE_LABEL[atleta.pe_dominante] ?? atleta.pe_dominante : null,
    status: ATLETA_STATUS_LABEL[atleta.status],
    data_inicio_clube: formatDataBr(atleta.data_inicio_clube),
    empresario:
      [
        atleta.empresario_nome,
        atleta.empresario_telefone ? formatTelefone(atleta.empresario_telefone) : null,
        atleta.empresario_email,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    tamanho_uniforme: atleta.tamanho_uniforme,

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

  const secoes = construirSecoesFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL, selecionados, valores, !!vigente);

  const buffer = await renderToBuffer(
    <FichaAtletaDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      nome={atleta.nome_completo}
      subtitulo={subtitulo}
      secoes={secoes}
      dadosDeJogo={dadosDeJogo}
      anotacoes={anotacoesPdf}
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
