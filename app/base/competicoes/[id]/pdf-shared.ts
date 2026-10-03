import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { verificarAcessoCompeticaoBase } from "@/lib/auth/competicao-base-guard";
import type { CompeticaoBaseCarregada } from "@/lib/futebol/competicao-query-base";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { LogoSrc } from "@/lib/pdf/logistica-shared";

/**
 * Carga comum das rotas de PDF de `/base/competicoes/[id]/**` — espelha
 * `app/competicoes/[id]/pdf-shared.ts`. Usa `verificarAcessoCompeticaoBase` (em vez de
 * `carregarCompeticaoBase` direto) pra que as rotas de PDF também respeitem o filtro de categoria
 * do usuário — sem isso, um link direto pro PDF escaparia da restrição que as telas já aplicam.
 */
export async function carregarParaPdfBase(competicaoId: string): Promise<{
  carregada: CompeticaoBaseCarregada;
  juventusLogoSrc: LogoSrc;
  subtitulo: string;
} | null> {
  const supabase = createClient();
  const carregada = await verificarAcessoCompeticaoBase(supabase, competicaoId);
  if (!carregada) return null;

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc: LogoSrc = { data: readFileSync(juventusLogoPath), format: "png" };

  const { competicao } = carregada;
  const subtitulo = `${competicao.nome} · Temporada ${competicao.temporada?.nome ?? "—"} · ${categoriaBaseLabel(competicao.categoria)}`;

  return { carregada, juventusLogoSrc, subtitulo };
}
