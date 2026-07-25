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
import type { AtletaRow, ComissaoTecnicaRow, StaffOperacionalComFuncaoRow } from "@/lib/supabase/types";

/** Gera o PDF do relatório avulso (Futebol Profissional) a partir do POST do formulário em
 * `app/relatorios/avulso/page.tsx` — não depende de nenhum `id` de jogo. */
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
    nascimento: formData.get("colNascimento") === "on",
    cpf: formData.get("colCpf") === "on",
    rg: formData.get("colRg") === "on",
    telefone: formData.get("colTelefone") === "on",
    extra: formData.get("colExtra") === "on",
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
    atletaIds.length > 0 ? supabase.from("atletas").select("*").in("id", atletaIds) : Promise.resolve({ data: [] }),
    comissaoIds.length > 0
      ? supabase.from("comissao_tecnica").select("*").in("id", comissaoIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabase
          .from("staff_operacional")
          .select("*, funcao:staff_funcoes_catalogo!staff_operacional_funcao_id_fkey(nome)")
          .in("id", staffIds)
      : Promise.resolve({ data: [] }),
  ]);

  const atletas: RelatorioAvulsoPessoa[] = ((atletasData ?? []) as AtletaRow[])
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"))
    .map((a) => ({
      nome: a.nome_completo,
      dataNascimento: a.data_nascimento,
      cpf: a.cpf,
      rg: a.rg,
      telefone: a.telefone,
      extra: a.posicao,
    }));

  const comissao: RelatorioAvulsoPessoa[] = ((comissaoData ?? []) as ComissaoTecnicaRow[])
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"))
    .map((c) => ({
      nome: c.nome_completo,
      dataNascimento: c.data_nascimento,
      cpf: c.cpf,
      rg: c.rg,
      telefone: c.telefone,
      extra: c.funcao,
    }));

  const staff: RelatorioAvulsoPessoa[] = ((staffData ?? []) as StaffOperacionalComFuncaoRow[])
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"))
    .map((s) => ({
      nome: s.nome_completo,
      dataNascimento: s.data_nascimento,
      cpf: s.cpf,
      rg: s.rg,
      telefone: s.telefone,
      extra: s.funcao?.nome ?? null,
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
