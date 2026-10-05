export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { buscarAssinaturas, resolverImagensAssinaturas } from "@/lib/assinaturas/actions";
import { ParecerSocialDocument, type ParecerSocialAssinatura } from "@/lib/pdf/parecer-social-document";
import type { AssistenciaSocialAtendimentoRow, AtletaBaseRow } from "@/lib/supabase/types";

/**
 * Rota do PDF do Parecer Social — acesso já garantido pelo middleware (módulo
 * `assistencia_social` liberado, mesmo prefixo `/base/assistencia-social`), sem checagem extra de
 * categoria igual ao Relatório de Dispensa: o módulo aqui é tudo-ou-nada, não por categoria.
 *
 * A assinatura NÃO é mais aplicada automaticamente aqui (era o que acontecia até 05/10: quem quer
 * que abrisse o PDF, inclusive o master só conferindo, saía gravado como "Assistente Social" —
 * bug apontado pelo Mateus). Agora é um botão explícito "Assinar" na ficha do atleta
 * (`BlocoAssinaturaDigital` em `app/base/assistencia-social/[id]/page.tsx`); esta rota só LÊ o que
 * já foi assinado (ou mostra "pendente" quando ainda não foi) — ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 1.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data } = await supabase.from("atletas_base").select("*").eq("id", params.id).single();
  if (!data) return new NextResponse("Atleta não encontrado.", { status: 404 });
  const atleta = data as AtletaBaseRow;

  const [{ data: atendimentosData }, fotoUrl] = await Promise.all([
    supabase
      .from("assistencia_social_atendimentos")
      .select("*")
      .eq("atleta_id", atleta.id)
      .order("data", { ascending: true }),
    getSignedPhotoUrl(supabase, atleta.foto_path),
  ]);
  const atendimentos = (atendimentosData ?? []) as AssistenciaSocialAtendimentoRow[];

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const assinaturasSalvas = await resolverImagensAssinaturas(supabase, await buscarAssinaturas("parecer_social", atleta.id));
  const assinaturaSalva = assinaturasSalvas.find((a) => a.papel === "assistente_social");
  const assinatura: ParecerSocialAssinatura | null = assinaturaSalva
    ? {
        nome: assinaturaSalva.nomeNoMomento,
        cargo: assinaturaSalva.cargoNoMomento,
        assinadoEm: assinaturaSalva.assinadoEm,
        assinaturaImagemSrc: assinaturaSalva.assinaturaImagemSrc,
      }
    : null;

  const buffer = await renderToBuffer(
    <ParecerSocialDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      atleta={{
        nome: atleta.nome_completo,
        dataNascimento: atleta.data_nascimento,
        categoria: categoriaBaseLabel(atleta.categoria),
      }}
      atendimentos={atendimentos.map((a) => ({
        data: a.data,
        anotacoes: a.anotacoes,
        encaminhamento: a.encaminhamento,
      }))}
      assinatura={assinatura}
      emitidoEm={new Date()}
    />,
  );

  const nomeArquivo = `parecer-social-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
