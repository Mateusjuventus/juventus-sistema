import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao, type CompeticaoCarregada } from "@/lib/futebol/competicao-query";
import type { LogoSrc } from "@/lib/pdf/logistica-shared";
import { clube } from "@/lib/clube";

/**
 * Carga comum das rotas de PDF de `/competicoes/[id]/**` — mesma `carregarCompeticao` das telas
 * (mesmos dados, mesmas regras), mais o escudo e o subtítulo padrão "Competição · Temporada".
 */
export async function carregarParaPdf(competicaoId: string): Promise<{
  carregada: CompeticaoCarregada;
  escudoClubeSrc: LogoSrc;
  subtitulo: string;
} | null> {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, competicaoId);
  if (!carregada) return null;

  const escudoClubePath = path.join(process.cwd(), "public", clube.escudo.completo);
  const escudoClubeSrc: LogoSrc = { data: readFileSync(escudoClubePath), format: "png" };

  const { competicao } = carregada;
  const subtitulo = `${competicao.nome} · Temporada ${competicao.temporada?.nome ?? "—"} · ${competicao.categoria}`;

  return { carregada, escudoClubeSrc, subtitulo };
}
