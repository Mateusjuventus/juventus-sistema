export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { ParecerFinalDocument, montarAssinaturasParecer } from "@/lib/pdf/parecer-final-document";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { buscarAssinaturas } from "@/lib/assinaturas/actions";
import type { AssinaturaCaptacao, CaptacaoBaseRow, ConfiguracaoParecerCaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * Rota do PDF do Parecer Final de Avaliação (ver docs/superpowers/specs/
 * 2026-08-19-parecer-final-treinador-design.md) — mesmo molde de
 * app/base/atletas/[categoria]/[id]/relatorio/pdf/route.tsx: busca o candidato, monta o buffer,
 * devolve `application/pdf`. Pode ser gerado mesmo antes do Treinador preencher as notas (saem em
 * branco/"—" no documento, ver `ParecerFinalDocument`), pra o Mateus conferir o layout a qualquer
 * momento.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: candidatoData } = await supabase.from("captacao_base").select("*").eq("id", params.id).single();
  if (!candidatoData) return new NextResponse("Candidato não encontrado.", { status: 404 });

  const candidato = candidatoData as CaptacaoBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, candidato.foto_path);

  const [{ data: configData }, assinaturasSalvas] = await Promise.all([
    supabase.from("configuracoes_parecer_captacao_base").select("assinaturas").limit(1).maybeSingle(),
    buscarAssinaturas("parecer_captacao_base", candidato.id),
  ]);
  const configAssinaturas =
    (configData as Pick<ConfiguracaoParecerCaptacaoBaseRow, "assinaturas"> | null)?.assinaturas ??
    ([] as AssinaturaCaptacao[]);
  const assinaturas = montarAssinaturasParecer(configAssinaturas, assinaturasSalvas);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <ParecerFinalDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      candidato={{
        nome: candidato.nome_completo,
        dataNascimento: candidato.data_nascimento,
        categoria: candidato.categoria ? categoriaBaseLabel(candidato.categoria) : null,
        posicao: candidato.posicao,
        cidade: candidato.cidade,
        uf: candidato.uf,
        clubeAnterior: candidato.clube_anterior,
        indicacao: candidato.indicacao,
        notaTecnica: candidato.nota_tecnica,
        notaFisica: candidato.nota_fisica,
        notaTatica: candidato.nota_tatica,
        notaComportamental: candidato.nota_comportamental,
        status: candidato.status,
        comentarios: candidato.parecer_comentarios,
        dataInicio: candidato.data_inicio,
        dataTermino: candidato.data_termino,
      }}
      assinaturas={assinaturas}
      emitidoEm={new Date()}
    />,
  );

  const nomeArquivo = `parecer-${candidato.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
