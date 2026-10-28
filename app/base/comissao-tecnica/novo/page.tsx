import { redirect } from "next/navigation";

/** Cadastro unificado agora vive em `/comissao-tecnica/novo` — ver docs/superpowers/specs/
 * 2026-10-28-unificacao-comissao-tecnica-design.md. Repassa a categoria pré-marcada, quando veio
 * do link "+ Nova pessoa" filtrado por categoria na lista antiga. */
export default function NovaComissaoBasePage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  redirect(`/comissao-tecnica/novo${searchParams.categoria ? `?categoria=${searchParams.categoria}` : ""}`);
}
