import { redirect } from "next/navigation";

/**
 * Desde 30/08 a Programação Semanal é o próprio Início do Futebol de Base (`app/base/page.tsx`),
 * não mais uma tela à parte — esta rota só existe pra não quebrar link/favorito antigo, redireciona
 * mantendo semana/categoria da URL (ver docs/superpowers/specs/2026-08-30-area-treinador-
 * programacao-design.md).
 */
export default function BaseProgramacaoPageRedirect({
  searchParams,
}: {
  searchParams: { semana?: string; categoria?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.semana) params.set("semana", searchParams.semana);
  if (searchParams.categoria) params.set("categoria", searchParams.categoria);
  const qs = params.toString();
  redirect(qs ? `/base?${qs}` : "/base");
}
