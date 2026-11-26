export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { RelacaoFormacaoProfissionalDocument } from "@/lib/pdf/relacao-formacao-profissional-document";
import { agruparPorBloco, calcularListaFinal, type AtletaParaRelacao, type ExcecaoRelacao } from "@/lib/futebol/relacao-formacao-profissional";
import type {
  AtletaContratoEvolucaoSalarialRow,
  AtletaContratoRow,
  AtletaRelacaoFormacaoProfissionalExcecaoRow,
  AtletaRow,
} from "@/lib/supabase/types";

/** PDF da Relação de Atletas (Formação e Profissional) — ver docs/superpowers/specs/2026-11-26-
 * relacao-formacao-profissional-design.md. Sem parâmetros de formulário (a lista vem inteira do
 * critério automático + exceções, não é escolhida na hora como o Relatório Avulso) — por isso GET
 * simples, não POST. Só master, mesma trava da tela (ver `app/base/relatorios/formacao-
 * profissional/page.tsx`) — aqui como 403, já que não tem pra onde redirecionar numa rota de
 * arquivo. */
export async function GET() {
  const supabase = createClient();
  if (!(await isMaster(supabase))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const [{ data: atletasData }, { data: contratosData }, { data: excecoesData }, { data: evolucoesData }] = await Promise.all([
    supabase.from("atletas").select("id, nome_completo, cpf, data_nascimento, status, ativo, categoria"),
    supabase.from("atleta_contratos").select("*").eq("vigente", true),
    supabase.from("atleta_relacao_formacao_profissional_excecoes").select("*"),
    supabase.from("atleta_contrato_evolucao_salarial").select("*"),
  ]);

  type AtletaCampos = Pick<AtletaRow, "id" | "nome_completo" | "cpf" | "data_nascimento" | "status" | "ativo" | "categoria">;
  const atletas = (atletasData ?? []) as AtletaCampos[];
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const excecoes = (excecoesData ?? []) as AtletaRelacaoFormacaoProfissionalExcecaoRow[];
  const evolucoes = (evolucoesData ?? []) as AtletaContratoEvolucaoSalarialRow[];

  const contratoPorAtleta = new Map(contratos.map((c) => [c.atleta_id, c]));
  const todosParaRelacao: AtletaParaRelacao[] = atletas.map((a) => ({
    id: a.id,
    nomeCompleto: a.nome_completo,
    cpf: a.cpf,
    dataNascimento: a.data_nascimento,
    status: a.status,
    ativo: a.ativo,
    categoria: a.categoria,
    contratoVigente: contratoPorAtleta.get(a.id) ?? null,
  }));

  const excecoesParaLib: ExcecaoRelacao[] = excecoes.map((e) => ({ atletaId: e.atleta_id, tipo: e.tipo }));
  const listaFinal = calcularListaFinal(todosParaRelacao, excecoesParaLib);
  const { formacao, profissional } = agruparPorBloco(listaFinal);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelacaoFormacaoProfissionalDocument
      juventusLogoSrc={juventusLogoSrc}
      formacao={formacao}
      profissional={profissional}
      evolucoes={evolucoes}
      geradoEm={new Date()}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="relacao-formacao-profissional.pdf"',
    },
  });
}
