export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ContratoFormacaoDocument } from "@/lib/pdf/contrato-formacao-document";
import { ContratoFormacaoMaiorDocument } from "@/lib/pdf/contrato-formacao-maior-document";
import { construirCamposContratoFormacao } from "@/lib/pdf/contrato-formacao-campos";
import type { AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";

/**
 * Gera o Contrato de Formação Desportiva em PDF, já preenchido com os dados do atleta e do
 * contrato vigente — ver docs/superpowers/specs/2026-11-11-contrato-formacao-fase2-design.md. Só
 * funciona quando o contrato vigente do atleta é do tipo "Formação" (mesmo espírito de
 * `app/atletas/[id]/ficha/pdf/route.tsx`).
 *
 * Qual dos dois modelos usar (menor/maior de idade) e os `campos` de cada um vêm de
 * `construirCamposContratoFormacao` (`lib/pdf/contrato-formacao-campos.ts`) — compartilhado com a
 * busca do texto padrão do editor de "Personalizar texto do contrato" (ver
 * docs/superpowers/specs/2026-11-16-contrato-formacao-texto-personalizado-design.md), pra nunca os
 * dois lugares calcularem os campos de um jeito diferente. A escolha do modelo é feita AQUI, pela
 * idade ATUAL do atleta — não uma escolha fixada na criação do contrato: se o atleta completar 18
 * anos durante a vigência do mesmo Contrato de Formação, o PDF passa a usar o modelo de maior
 * automaticamente, sem precisar editar nada.
 *
 * `texto_contrato_custom`/`texto_clausulas_adicionais_custom` (quando preenchidos nesse contrato)
 * substituem o corpo das cláusulas gerado a partir do template — a assinatura (data, JUVENTUS SAF,
 * ATLETA, testemunhas) continua sempre automática, nos dois casos (ver `montarBlocos` em cada um
 * dos dois arquivos de documento).
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

  const { maiorDeIdade, camposMenor, camposMaior } = construirCamposContratoFormacao(atleta, contrato);
  const nomeArquivo = `contrato-formacao-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  let buffer: Buffer;
  if (maiorDeIdade) {
    const cabecalhoPath = path.join(process.cwd(), "public/brand/contrato-formacao-maior-cabecalho.png");
    const rodapePath = path.join(process.cwd(), "public/brand/contrato-formacao-maior-rodape.png");
    const cabecalhoSrc = { data: readFileSync(cabecalhoPath), format: "png" as const };
    const rodapeSrc = { data: readFileSync(rodapePath), format: "png" as const };
    buffer = await renderToBuffer(
      <ContratoFormacaoMaiorDocument
        cabecalhoSrc={cabecalhoSrc}
        rodapeSrc={rodapeSrc}
        campos={camposMaior}
        textoContratoCustom={contrato.texto_contrato_custom}
        textoClausulasAdicionaisCustom={contrato.texto_clausulas_adicionais_custom}
      />,
    );
  } else {
    const cabecalhoPath = path.join(process.cwd(), "public/brand/contrato-formacao-cabecalho.png");
    const rodapePath = path.join(process.cwd(), "public/brand/contrato-formacao-rodape.png");
    const cabecalhoSrc = { data: readFileSync(cabecalhoPath), format: "png" as const };
    const rodapeSrc = { data: readFileSync(rodapePath), format: "png" as const };
    buffer = await renderToBuffer(
      <ContratoFormacaoDocument
        cabecalhoSrc={cabecalhoSrc}
        rodapeSrc={rodapeSrc}
        campos={camposMenor}
        textoContratoCustom={contrato.texto_contrato_custom}
        textoClausulasAdicionaisCustom={contrato.texto_clausulas_adicionais_custom}
      />,
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
