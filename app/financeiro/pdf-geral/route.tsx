export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiro } from "@/lib/pdf/assinaturas";
import { podeVerCampoSensivel } from "@/lib/auth/role";
import {
  calcularGeralProfissional,
  custoAtletaProfissional,
  mapaContratoVigentePorAtleta,
  tipoPagamentoAtletaProfissional,
} from "@/lib/futebol/financeiro";
import {
  RelatorioGeralProfissionalDocument,
  type RelatorioGeralProfissionalAtleta,
  type RelatorioGeralProfissionalComissao,
  type RelatorioGeralProfissionalFatia,
} from "@/lib/pdf/relatorio-geral-profissional-document";
import type { AtletaContratoRow, AtletaRow, ComissaoTecnicaRow } from "@/lib/supabase/types";

/** PDF da aba "Geral" de `/financeiro` (Profissional) — totalmente separado do PDF de Prestação de
 * Contas de jogos (`../pdf/route.tsx`), espelhando `/base/financeiro/pdf-geral`. Ver
 * docs/superpowers/specs/2026-10-16-financeiro-contrato-design.md. Mesmo cálculo da tela
 * (`GeralProfissionalView`), via `lib/futebol/financeiro.ts`. */
export async function GET() {
  const supabase = createClient();

  const [
    { data: comissaoData },
    { data: atletasData },
    { data: contratosData },
    { assinatura1, assinatura2 },
    podeVerSalario,
  ] = await Promise.all([
    supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true }),
    supabase.from("atletas").select("*").order("nome_completo", { ascending: true }),
    supabase.from("atleta_contratos").select("*").eq("vigente", true),
    getAssinaturasFinanceiro(supabase),
    podeVerCampoSensivel(supabase, "salario"),
  ]);

  if (!podeVerSalario) {
    return new NextResponse("Você não tem permissão para ver os valores desta aba.", { status: 403 });
  }

  const comissao = (comissaoData ?? []) as ComissaoTecnicaRow[];
  const atletas = (atletasData ?? []) as AtletaRow[];
  const contratosVigentes = (contratosData ?? []) as AtletaContratoRow[];
  const contratoPorAtleta = mapaContratoVigentePorAtleta(contratosVigentes);

  if (comissao.length === 0 && atletas.length === 0) {
    return new NextResponse("Ainda não há nada cadastrado na aba Geral.", { status: 400 });
  }

  const { custoComissao, custoAtletas, totalGeral } = calcularGeralProfissional(
    comissao,
    atletas,
    contratosVigentes,
  );

  // Mesmas 2 cores (sem a 3ª fatia de despesas avulsas, que não entra aqui) — ver geral-view.tsx.
  const composicaoPdf: RelatorioGeralProfissionalFatia[] = [
    { label: "Comissão Técnica", valor: custoComissao, cor: "#5C0A35" },
    { label: "Atletas", valor: custoAtletas, cor: "#B98F1E" },
  ];

  const comissaoPdf: RelatorioGeralProfissionalComissao[] = comissao.map((c) => ({
    nome: c.nome_completo,
    funcao: c.funcao,
    valorSalario: c.valor_salario,
  }));

  const atletasPdf: RelatorioGeralProfissionalAtleta[] = atletas.map((a) => ({
    nome: a.nome_completo,
    tipoPagamento: tipoPagamentoAtletaProfissional(a.tipo_contrato),
    valor: custoAtletaProfissional(a, contratoPorAtleta) || null,
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioGeralProfissionalDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      custoComissao={custoComissao}
      custoAtletas={custoAtletas}
      totalGeral={totalGeral}
      composicao={composicaoPdf}
      comissao={comissaoPdf}
      atletas={atletasPdf}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="custo-comissao-tecnica-atletas.pdf"',
    },
  });
}
