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
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS, SETOR_COMISSAO_TECNICA_OPTIONS } from "@/lib/validation/schemas";
import { CATEGORIAS_COMISSAO_TECNICA } from "@/lib/auth/categorias-base";
import { FichaComissaoDocument, type FichaComissaoSecao } from "@/lib/pdf/ficha-comissao-document";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS.map((o) => [o.value, o.label]),
);
const SETOR_LABEL: Record<string, string> = Object.fromEntries(
  SETOR_COMISSAO_TECNICA_OPTIONS.map((o) => [o.value, o.label]),
);

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Gera a ficha individual da Comissão Técnica/Diretoria em PDF — pedido do Mateus em 14/11/2026
 * (item 8, ponto 5), mirroring `app/atletas/[id]/ficha/pdf/route.tsx` mas sem o seletor de campos
 * (`?campos=...`): aqui a ficha é sempre completa, com todas as seções que se aplicam à pessoa.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("comissao_tecnica").select("*").eq("id", params.id).single();
  if (!data) return new NextResponse("Cadastro não encontrado.", { status: 404 });

  const pessoa = data as ComissaoTecnicaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, pessoa.foto_path);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const categoriasLabel = pessoa.categorias
    .map((c) => CATEGORIAS_COMISSAO_TECNICA.find((o) => o.value === c)?.label ?? c)
    .join(" · ");
  const subtitulo = `${pessoa.funcao}${categoriasLabel ? ` · ${categoriasLabel}` : ""}`;

  const endereco = [pessoa.logradouro, pessoa.numero, pessoa.complemento, pessoa.bairro, pessoa.cidade, pessoa.uf]
    .filter(Boolean)
    .join(", ");

  const secoes: FichaComissaoSecao[] = [
    {
      titulo: "Dados pessoais",
      dados: [
        { label: "Nome completo", valor: pessoa.nome_completo },
        { label: "Apelido", valor: pessoa.apelido },
        { label: "RG", valor: pessoa.rg },
        { label: "CPF", valor: formatCPF(pessoa.cpf) },
        { label: "Data de nascimento", valor: formatDataBr(pessoa.data_nascimento) },
        { label: "Telefone", valor: pessoa.telefone ? formatTelefone(pessoa.telefone) : null },
        { label: "E-mail", valor: pessoa.email },
      ],
    },
    {
      titulo: "Endereço",
      dados: pessoa.cep || endereco ? [
        { label: "CEP", valor: pessoa.cep ? formatCEP(pessoa.cep) : null },
        { label: "Endereço", valor: endereco || null },
      ] : null,
      avisoVazio: "Endereço não cadastrado.",
    },
    {
      titulo: "Função",
      dados: [
        { label: "Categoria(s)", valor: categoriasLabel || null },
        { label: "Função/cargo", valor: pessoa.funcao },
        {
          label: "Tipo de contrato",
          valor: pessoa.tipo_contrato ? TIPO_CONTRATO_LABEL[pessoa.tipo_contrato] ?? pessoa.tipo_contrato : null,
        },
        { label: "Setor", valor: pessoa.setor ? SETOR_LABEL[pessoa.setor] ?? pessoa.setor : null },
        { label: "Quando iniciou", valor: pessoa.data_inicio ? formatDataBr(pessoa.data_inicio) : null },
        { label: "Salário mensal", valor: pessoa.valor_salario != null ? formatMoeda(pessoa.valor_salario) : null },
        { label: "Status", valor: pessoa.ativo ? "Ativo" : "Inativo" },
      ],
    },
  ];

  if (pessoa.tipo_contrato === "clt") {
    secoes.push({
      titulo: "Dados de pagamento (CLT)",
      dados: [
        { label: "Chave PIX", valor: pessoa.chave_pix },
        { label: "Banco", valor: pessoa.banco },
        { label: "Agência", valor: pessoa.agencia },
        { label: "Conta", valor: pessoa.conta },
      ],
    });
  }

  if (pessoa.tipo_contrato === "pj") {
    secoes.push({
      titulo: "Dados de pagamento (PJ)",
      dados: [
        { label: "Nome da Empresa", valor: pessoa.empresa_nome },
        { label: "CNPJ", valor: pessoa.empresa_cnpj },
        { label: "Chave PIX da empresa", valor: pessoa.empresa_chave_pix },
      ],
    });
  }

  const buffer = await renderToBuffer(
    <FichaComissaoDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      nome={pessoa.nome_completo}
      subtitulo={subtitulo}
      secoes={secoes}
    />,
  );

  const nomeArquivo = `ficha-${pessoa.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
