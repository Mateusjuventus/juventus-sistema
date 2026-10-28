import { redirect } from "next/navigation";

/**
 * A Comissão Técnica/Diretoria foi unificada com a do Profissional numa lista só, em blocos por
 * categoria ("Profissional" é só mais uma categoria agora) — ver docs/superpowers/specs/
 * 2026-10-28-unificacao-comissao-tecnica-design.md. Esta rota (e o resto de `/base/comissao-
 * tecnica/*`, exceto `/organograma`, que continua só da Base) virou redirect pra rota canônica
 * única, `/comissao-tecnica`, repassando os mesmos filtros de busca/categoria.
 */
export default function ComissaoTecnicaBasePage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.categoria) params.set("categoria", searchParams.categoria);
  const query = params.toString();
  redirect(`/comissao-tecnica${query ? `?${query}` : ""}`);
}
