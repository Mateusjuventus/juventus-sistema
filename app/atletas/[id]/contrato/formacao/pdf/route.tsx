export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatCPF } from "@/lib/validation/cpf";
import { formatCEP } from "@/lib/validation/cep";
import { enderecoFichaAtleta } from "@/lib/futebol/ficha-atleta";
import { valorPorExtenso } from "@/lib/pdf/valor-extenso";
import { formatDataBr, formatDataExtenso } from "@/lib/pdf/logistica-shared";
import { atletaMaiorIdade } from "@/lib/futebol/contrato";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ContratoFormacaoDocument, type ContratoFormacaoCampos } from "@/lib/pdf/contrato-formacao-document";
import { ContratoFormacaoMaiorDocument, type ContratoFormacaoMaiorCampos } from "@/lib/pdf/contrato-formacao-maior-document";
import type { AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";

function naturalidade(cidade: string | null, uf: string | null): string {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || "";
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function capitalizar(texto: string): string {
  return texto.length > 0 ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

/**
 * Gera o Contrato de Formação Desportiva em PDF, já preenchido com os dados do atleta e do
 * contrato vigente — ver docs/superpowers/specs/2026-11-11-contrato-formacao-fase2-design.md. Só
 * funciona quando o contrato vigente do atleta é do tipo "Formação" (mesmo espírito de
 * `app/atletas/[id]/ficha/pdf/route.tsx`).
 *
 * Qual dos dois modelos usar (menor/maior de idade) é decidido AQUI, pela idade ATUAL do atleta
 * (`atletaMaiorIdade`, calculada na hora de gerar — não uma escolha fixada na criação do
 * contrato): se o atleta completar 18 anos durante a vigência do mesmo Contrato de Formação, o
 * PDF passa a usar o modelo de maior automaticamente, sem precisar editar nada.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: atletaData }, { data: contratoData }] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("atleta_contratos").select("*").eq("atleta_id", params.id).eq("vigente", true).maybeSingle(),
  ]);
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = atletaData as AtletaRow;
  const contrato = contratoData as AtletaContratoRow | null;
  if (!contrato || contrato.tipo_contrato !== "formacao") {
    return new NextResponse("Este atleta não tem um contrato de Formação vigente.", { status: 404 });
  }

  const endereco =
    enderecoFichaAtleta({
      logradouro: atleta.logradouro,
      numero: atleta.numero,
      complemento: atleta.complemento,
      bairro: atleta.bairro,
      cidade: atleta.cidade,
      uf: atleta.uf,
      cepFormatado: atleta.cep ? formatCEP(atleta.cep) : null,
    }) ?? "";

  const bolsaValor =
    contrato.bolsa_aprendizagem > 0
      ? `${formatMoeda(contrato.bolsa_aprendizagem)} (${capitalizar(valorPorExtenso(contrato.bolsa_aprendizagem))})`
      : "";
  const dataAssinaturaExtenso = formatDataExtenso(contrato.vigencia_inicio);

  const maiorDeIdade = atletaMaiorIdade(atleta.data_nascimento, hojeBrasilia());
  const nomeArquivo = `contrato-formacao-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  let buffer: Buffer;
  if (maiorDeIdade) {
    const campos: ContratoFormacaoMaiorCampos = {
      nomeCompleto: atleta.nome_completo,
      dataNascimento: formatDataBr(atleta.data_nascimento),
      rg: atleta.rg,
      cpf: atleta.cpf ? formatCPF(atleta.cpf) : "",
      email: atleta.email ?? "",
      endereco,
      vigenciaInicio: formatDataBr(contrato.vigencia_inicio),
      vigenciaFim: formatDataBr(contrato.vigencia_fim),
      bolsaValor,
      dataAssinaturaExtenso,
    };
    const cabecalhoPath = path.join(process.cwd(), "public/brand/contrato-formacao-maior-cabecalho.png");
    const rodapePath = path.join(process.cwd(), "public/brand/contrato-formacao-maior-rodape.png");
    const cabecalhoSrc = { data: readFileSync(cabecalhoPath), format: "png" as const };
    const rodapeSrc = { data: readFileSync(rodapePath), format: "png" as const };
    buffer = await renderToBuffer(
      <ContratoFormacaoMaiorDocument cabecalhoSrc={cabecalhoSrc} rodapeSrc={rodapeSrc} campos={campos} />,
    );
  } else {
    const campos: ContratoFormacaoCampos = {
      nomeCompleto: atleta.nome_completo,
      dataNascimento: formatDataBr(atleta.data_nascimento),
      naturalidade: naturalidade(atleta.cidade_natal, atleta.uf_natal),
      rg: atleta.rg,
      cpf: atleta.cpf ? formatCPF(atleta.cpf) : "",
      maeNome: atleta.mae_nome ?? "",
      maeCpf: atleta.mae_cpf ? formatCPF(atleta.mae_cpf) : "",
      paiNome: atleta.pai_nome ?? "",
      paiCpf: atleta.pai_cpf ? formatCPF(atleta.pai_cpf) : "",
      endereco,
      vigenciaInicio: formatDataBr(contrato.vigencia_inicio),
      vigenciaFim: formatDataBr(contrato.vigencia_fim),
      bolsaValor,
      dataAssinaturaExtenso,
    };
    const cabecalhoPath = path.join(process.cwd(), "public/brand/contrato-formacao-cabecalho.png");
    const rodapePath = path.join(process.cwd(), "public/brand/contrato-formacao-rodape.png");
    const cabecalhoSrc = { data: readFileSync(cabecalhoPath), format: "png" as const };
    const rodapeSrc = { data: readFileSync(rodapePath), format: "png" as const };
    buffer = await renderToBuffer(
      <ContratoFormacaoDocument cabecalhoSrc={cabecalhoSrc} rodapeSrc={rodapeSrc} campos={campos} />,
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
