import { type NextRequest, NextResponse } from "next/server";

/** Exportação unificada agora vive em `/comissao-tecnica/export` — ver docs/superpowers/specs/
 * 2026-10-28-unificacao-comissao-tecnica-design.md. Repassa os mesmos filtros de busca/categoria. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  const q = searchParams.get("q");
  const categoria = searchParams.get("categoria");
  if (q) params.set("q", q);
  if (categoria) params.set("categoria", categoria);
  const query = params.toString();

  return NextResponse.redirect(new URL(`/comissao-tecnica/export${query ? `?${query}` : ""}`, request.url));
}
