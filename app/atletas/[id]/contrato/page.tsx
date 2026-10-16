import { redirect } from "next/navigation";

/**
 * Rota antiga da aba "Contrato" (ver `docs/superpowers/specs/
 * 2026-10-16-atleta-dados-esportivos-contrato-design.md`) — deixou de existir como aba própria em
 * 2026-10-16 (pedido do Mateus: o contrato precisava estar visível direto ao abrir o cartão do
 * atleta, não só depois de clicar numa aba separada). O conteúdo (vigente + histórico + botão
 * "Novo contrato") agora mora em `components/contrato-secao.tsx`, embutido nas telas "Ver atleta"
 * e "Editar atleta". Este redirect fica só pra não quebrar um link/favorito antigo pra esta URL.
 */
export default function ContratoAtletaPage({ params }: { params: { id: string } }) {
  redirect(`/atletas/${params.id}/ver`);
}
