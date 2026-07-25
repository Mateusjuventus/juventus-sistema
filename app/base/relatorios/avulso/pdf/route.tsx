export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  RelatorioAvulsoDocument,
  type RelatorioAvulsoColunas,
  type RelatorioAvulsoInfoJogo,
  type RelatorioAvulsoPessoa,
} from "@/lib/pdf/relatorio-avulso-document";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow, StaffOperacionalBaseComFuncaoRow } from "@/lib/supabase/types";

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

const STATUS_LABEL: Record<string, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
};

const TIPO_QUARTO_LABEL: Record<string, string> = {
  single: "Single",
  duplo: "Duplo",
  triplo: "Triplo",
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

function enderecoStaff(row: {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}): string | null {
  const partes = [
    row.logradouro,
    row.numero ? `nº ${row.numero}` : null,
    row.complemento,
    row.bairro,
    row.cidade && row.uf ? `${row.cidade}/${row.uf}` : row.cidade || row.uf,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : null;
}

/** Espelha `app/relatorios/avulso/pdf/route.tsx` para o Futebol de Base — mesma lógica, tabelas
 * `_base` e rótulo de categoria (Sub-20 etc.) preenchido, ao contrário do Profissional. */
export async function POST(request: Request) {
  const formData = await request.formData();

  const titulo = String(formData.get("titulo") ?? "").trim() || "Relação";
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  const infoJogoBruta: RelatorioAvulsoInfoJogo = {
    adversario: String(formData.get("jogoAdversario") ?? "").trim(),
    competicao: String(formData.get("jogoCompeticao") ?? "").trim(),
    data: String(formData.get("jogoData") ?? "").trim(),
    horario: String(formData.get("jogoHorario") ?? "").trim(),
    local: String(formData.get("jogoLocal") ?? "").trim(),
  };
  const infoJogo = Object.values(infoJogoBruta).some(Boolean) ? infoJogoBruta : null;

  const colunas: RelatorioAvulsoColunas = {
    apelido: formData.get("colApelido") === "on",
    nascimento: formData.get("colNascimento") === "on",
    cpf: formData.get("colCpf") === "on",
    rg: formData.get("colRg") === "on",
    telefone: formData.get("colTelefone") === "on",
    email: formData.get("colEmail") === "on",
    endereco: formData.get("colEndereco") === "on",
    posicao: formData.get("colPosicao") === "on",
    funcao: formData.get("colFuncao") === "on",
    numeroCamisa: formData.get("colNumeroCamisa") === "on",
    numeroRegistro: formData.get("colNumeroRegistro") === "on",
    peDominante: formData.get("colPeDominante") === "on",
    naturalidade: formData.get("colNaturalidade") === "on",
    dataInicioClube: formData.get("colDataInicioClube") === "on",
    tipoContrato: formData.get("colTipoContrato") === "on",
    dataFimContrato: formData.get("colDataFimContrato") === "on",
    contratoFormacao: formData.get("colContratoFormacao") === "on",
    empresarioNome: formData.get("colEmpresarioNome") === "on",
    status: formData.get("colStatus") === "on",
    tipoQuartoPreferido: formData.get("colTipoQuartoPreferido") === "on",
    categoria: formData.get("colCategoria") === "on",
  };

  const atletaIds: string[] = [];
  const comissaoIds: string[] = [];
  const staffIds: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (String(value) !== "on") continue;
    if (key.startsWith("atleta_")) atletaIds.push(key.slice("atleta_".length));
    else if (key.startsWith("comissao_")) comissaoIds.push(key.slice("comissao_".length));
    else if (key.startsWith("staff_")) staffIds.push(key.slice("staff_".length));
  }

  const supabase = createClient();

  const [{ data: atletasData }, { data: comissaoData }, { data: staffData }] = await Promise.all([
    atletaIds.length > 0 ? supabase.from("atletas_base").select("*").in("id", atletaIds) : Promise.resolve({ data: [] }),
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica_base").select("*").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase
          .from("staff_operacional_base")
          .select("*, funcao:staff_funcoes_catalogo!staff_operacional_base_funcao_id_fkey(nome)")
          .in("id", staffIds)
      : Promise.resolve({ data: [] }),
  ]);

  const atletas: RelatorioAvulsoPessoa[] = ((atletasData ?? []) as AtletaBaseRow[])
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"))
    .map((a) => ({
      nome: a.nome_completo,
      apelido: a.apelido,
      dataNascimento: a.data_nascimento,
      cpf: a.cpf,
      rg: a.rg,
      telefone: a.telefone,
      email: null,
      endereco: a.endereco_atual,
      posicao: a.posicao,
      funcao: null,
      numeroCamisa: a.numero_camisa,
      numeroRegistro: numeroRegistro(a.numero_cbf, a.numero_fpf),
      peDominante: a.pe_dominante ? PE_DOMINANTE_LABEL[a.pe_dominante] ?? a.pe_dominante : null,
      naturalidade: naturalidade(a.cidade_natal, a.uf_natal),
      dataInicioClube: a.data_inicio_clube,
      tipoContrato: a.tipo_contrato
        ? ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === a.tipo_contrato)?.label ?? a.tipo_contrato
        : null,
      dataFimContrato: a.data_fim_contrato,
      contratoFormacao: a.possui_contrato_formacao,
      empresarioNome: a.empresario_nome,
      status: STATUS_LABEL[a.status] ?? a.status,
      tipoQuartoPreferido: null,
      categoria: categoriaBaseLabel(a.categoria),
    }));

  const comissao: RelatorioAvulsoPessoa[] = ((comissaoData ?? []) as ComissaoTecnicaBaseRow[])
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"))
    .map((c) => ({
      nome: c.nome_completo,
      apelido: c.apelido,
      dataNascimento: c.data_nascimento,
      cpf: c.cpf,
      rg: c.rg,
      telefone: c.telefone,
      email: c.email,
      endereco: null,
      posicao: null,
      funcao: c.funcao,
      numeroCamisa: null,
      numeroRegistro: null,
      peDominante: null,
      naturalidade: null,
      dataInicioClube: null,
      tipoContrato: null,
      dataFimContrato: null,
      contratoFormacao: null,
      empresarioNome: null,
      status: null,
      tipoQuartoPreferido: c.tipo_quarto_preferido ? TIPO_QUARTO_LABEL[c.tipo_quarto_preferido] ?? c.tipo_quarto_preferido : null,
      categoria: categoriaBaseLabel(c.categoria),
    }));

  const staff: RelatorioAvulsoPessoa[] = ((staffData ?? []) as StaffOperacionalBaseComFuncaoRow[])
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"))
    .map((s) => ({
      nome: s.nome_completo,
      apelido: null,
      dataNascimento: s.data_nascimento,
      cpf: s.cpf,
      rg: s.rg,
      telefone: s.telefone,
      email: s.email,
      endereco: enderecoStaff(s),
      posicao: null,
      funcao: s.funcao?.nome ?? null,
      numeroCamisa: null,
      numeroRegistro: null,
      peDominante: null,
      naturalidade: null,
      dataInicioClube: null,
      tipoContrato: null,
      dataFimContrato: null,
      contratoFormacao: null,
      empresarioNome: null,
      status: null,
      tipoQuartoPreferido: null,
      categoria: null,
    }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioAvulsoDocument
      juventusLogoSrc={juventusLogoSrc}
      titulo={titulo}
      descricao={descricao}
      infoJogo={infoJogo}
      atletas={atletas}
      comissao={comissao}
      staff={staff}
      colunas={colunas}
    />,
  );

  const nomeArquivo = `${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
