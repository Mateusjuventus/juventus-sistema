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
import { ContratoFormacaoDocument, type ContratoFormacaoCampos } from "@/lib/pdf/contrato-formacao-document";
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
 * contrato vigente — ver docs/superpowers/specs/2026-11-09-contrato-formacao-design.md. Só
 * funciona quando o contrato vigente do atleta é do tipo "Formação" (confirmado com o Mateus: não
 * é um fluxo que deveria acontecer fora disso, por isso 404 simples, sem mensagem especial — mesmo
 * espírito de `app/atletas/[id]/ficha/pdf/route.tsx`).
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
    bolsaValor:
      contrato.bolsa_aprendizagem > 0
        ? `${formatMoeda(contrato.bolsa_aprendizagem)} (${capitalizar(valorPorExtenso(contrato.bolsa_aprendizagem))})`
        : "",
    dataAssinaturaExtenso: formatDataExtenso(contrato.vigencia_inicio),
  };

  const cabecalhoPath = path.join(process.cwd(), "public/brand/contrato-formacao-cabecalho.png");
  const rodapePath = path.join(process.cwd(), "public/brand/contrato-formacao-rodape.png");
  const cabecalhoSrc = { data: readFileSync(cabecalhoPath), format: "png" as const };
  const rodapeSrc = { data: readFileSync(rodapePath), format: "png" as const };

  const buffer = await renderToBuffer(
    <ContratoFormacaoDocument cabecalhoSrc={cabecalhoSrc} rodapeSrc={rodapeSrc} campos={campos} />,
  );

  const nomeArquivo = `contrato-formacao-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
