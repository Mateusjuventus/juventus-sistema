import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao, type CompeticaoCarregada } from "@/lib/futebol/competicao-query";
import type { LogoSrc } from "@/lib/pdf/logistica-shared";

/**
 * Carga comum das rotas de PDF de `/competicoes/[id]/**` — mesma `carregarCompeticao` das telas
 * (mesmos dados, mesmas regras), mais o escudo e o subtítulo padrão "Competição · Temporada".
 */
export async function carregarParaPdf(competicaoId: string): Promise<{
  carregada: CompeticaoCarregada;
  juventusLogoSrc: LogoSrc;
  subtitulo: string;
} | null> {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, competicaoId);
  if (!carregada) return null;

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc: LogoSrc = { data: readFileSync(juventusLogoPath), format: "png" };

  const { competicao } = carregada;
  const subtitulo = `${competicao.nome} · Temporada ${competicao.temporada?.nome ?? "—"} · ${competicao.categoria}`;

  return { carregada, juventusLogoSrc, subtitulo };
}
