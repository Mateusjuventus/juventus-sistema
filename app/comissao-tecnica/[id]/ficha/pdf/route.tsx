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
import { camposFichaComissao, camposFichaComissaoDaQueryString } from "@/lib/futebol/ficha-comissao";
import { FichaComissaoDocument, type FichaComissaoSecao } from "@/lib/pdf/ficha-comissao-document";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";
import { clube } from "@/lib/clube";

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
 * (item 8, ponto 5), mirroring `app/atletas/[id]/ficha/pdf/route.tsx`.
 *
 * Revisão do mesmo dia (junto da Vigência PJ): ganhou o seletor de campos (`?campos=...`) — o
 * comentário original dizia "aqui a ficha é sempre completa... sem nada pra filtrar", mas o Mateus
 * pediu a mesma escolha de campos que o atleta já tem (ver `lib/futebol/ficha-comissao.ts`,
 * espelhando `lib/futebol/ficha-atleta.ts`, e o modal em `components/ficha-comissao-modal.tsx`).
 * Sem o parâmetro (link antigo, ou quem gera sem passar pelo modal) a ficha continua completa.
 *
 * Cada seção é construída manualmente aqui (em vez de um helper genérico como
 * `construirSecoesFichaAtleta`) porque "Endereço" não é uma lista simples de label/valor — é um
 * par (CEP + Endereço) com aviso próprio quando a pessoa não tem nenhum dos dois cadastrados. Uma
 * seção sem nenhum campo marcado simplesmente não entra em `secoes` (em vez de aparecer com a
 * barra colorida do título e nada embaixo).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("comissao_tecnica").select("*").eq("id", params.id).single();
  if (!data) return new NextResponse("Cadastro não encontrado.", { status: 404 });

  const pessoa = data as ComissaoTecnicaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, pessoa.foto_path);

  const campos = camposFichaComissao(pessoa.tipo_contrato);
  const { searchParams } = new URL(request.url);
  const selecionados = camposFichaComissaoDaQueryString(searchParams, campos);
  const marcado = (chave: string) => selecionados.has(chave);

  const escudoClubePath = path.join(process.cwd(), "public", clube.escudo.completo);
  const escudoClubeSrc = { data: readFileSync(escudoClubePath), format: "png" as const };

  const categoriasLabel = pessoa.categorias
    .map((c) => CATEGORIAS_COMISSAO_TECNICA.find((o) => o.value === c)?.label ?? c)
    .join(" · ");
  const subtitulo = `${pessoa.funcao}${categoriasLabel ? ` · ${categoriasLabel}` : ""}`;

  const endereco = [pessoa.logradouro, pessoa.numero, pessoa.complemento, pessoa.bairro, pessoa.cidade, pessoa.uf]
    .filter(Boolean)
    .join(", ");

  type Dado = { label: string; valor: string | null };
  const soDados = (itens: (Dado | null)[]): Dado[] => itens.filter((d): d is Dado => d !== null);

  const secoes: FichaComissaoSecao[] = [];

  const dadosPessoais = soDados([
    marcado("nome_completo") ? { label: "Nome completo", valor: pessoa.nome_completo } : null,
    marcado("apelido") ? { label: "Apelido", valor: pessoa.apelido } : null,
    marcado("rg") ? { label: "RG", valor: pessoa.rg } : null,
    marcado("cpf") ? { label: "CPF", valor: formatCPF(pessoa.cpf) } : null,
    marcado("data_nascimento") ? { label: "Data de nascimento", valor: formatDataBr(pessoa.data_nascimento) } : null,
    marcado("telefone") ? { label: "Telefone", valor: pessoa.telefone ? formatTelefone(pessoa.telefone) : null } : null,
    marcado("email") ? { label: "E-mail", valor: pessoa.email } : null,
  ]);
  if (dadosPessoais.length > 0) secoes.push({ titulo: "Dados pessoais", dados: dadosPessoais });

  if (marcado("endereco")) {
    secoes.push({
      titulo: "Endereço",
      dados:
        pessoa.cep || endereco
          ? [
              { label: "CEP", valor: pessoa.cep ? formatCEP(pessoa.cep) : null },
              { label: "Endereço", valor: endereco || null },
            ]
          : null,
      avisoVazio: "Endereço não cadastrado.",
    });
  }

  const dadosFuncao = soDados([
    marcado("categorias") ? { label: "Categoria(s)", valor: categoriasLabel || null } : null,
    marcado("funcao") ? { label: "Função/cargo", valor: pessoa.funcao } : null,
    marcado("tipo_contrato")
      ? {
          label: "Tipo de contrato",
          valor: pessoa.tipo_contrato ? TIPO_CONTRATO_LABEL[pessoa.tipo_contrato] ?? pessoa.tipo_contrato : null,
        }
      : null,
    marcado("setor") ? { label: "Setor", valor: pessoa.setor ? SETOR_LABEL[pessoa.setor] ?? pessoa.setor : null } : null,
    marcado("data_inicio")
      ? {
          label: pessoa.tipo_contrato === "pj" ? "Vigência: Início" : "Quando iniciou",
          valor: pessoa.data_inicio ? formatDataBr(pessoa.data_inicio) : null,
        }
      : null,
    // Vigência: Término — só existe pra PJ (ver `camposFichaComissao`, que só inclui esse campo na
    // lista disponível nesse caso — `marcado(...)` já dá `false` pra quem não é PJ).
    marcado("data_fim") ? { label: "Vigência: Término", valor: pessoa.data_fim ? formatDataBr(pessoa.data_fim) : null } : null,
    marcado("valor_salario")
      ? { label: "Salário mensal", valor: pessoa.valor_salario != null ? formatMoeda(pessoa.valor_salario) : null }
      : null,
    marcado("status") ? { label: "Status", valor: pessoa.ativo ? "Ativo" : "Inativo" } : null,
  ]);
  if (dadosFuncao.length > 0) secoes.push({ titulo: "Função", dados: dadosFuncao });

  if (pessoa.tipo_contrato === "clt") {
    const dadosPagamento = soDados([
      marcado("pagamento_chave_pix") ? { label: "Chave PIX", valor: pessoa.chave_pix } : null,
      marcado("pagamento_banco") ? { label: "Banco", valor: pessoa.banco } : null,
      marcado("pagamento_agencia") ? { label: "Agência", valor: pessoa.agencia } : null,
      marcado("pagamento_conta") ? { label: "Conta", valor: pessoa.conta } : null,
    ]);
    if (dadosPagamento.length > 0) secoes.push({ titulo: "Dados de pagamento (CLT)", dados: dadosPagamento });
  }

  if (pessoa.tipo_contrato === "pj") {
    const dadosPagamento = soDados([
      marcado("pagamento_empresa_nome") ? { label: "Nome da Empresa", valor: pessoa.empresa_nome } : null,
      marcado("pagamento_empresa_cnpj") ? { label: "CNPJ", valor: pessoa.empresa_cnpj } : null,
      marcado("pagamento_empresa_chave_pix") ? { label: "Chave PIX da empresa", valor: pessoa.empresa_chave_pix } : null,
    ]);
    if (dadosPagamento.length > 0) secoes.push({ titulo: "Dados de pagamento (PJ)", dados: dadosPagamento });
  }

  const buffer = await renderToBuffer(
    <FichaComissaoDocument
      escudoClubeSrc={escudoClubeSrc}
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
