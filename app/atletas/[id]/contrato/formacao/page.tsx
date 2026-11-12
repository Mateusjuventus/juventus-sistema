import { redirect } from "next/navigation";

/**
 * Até 12/11/2026 esta era a tela própria de "Contrato de Formação" (ver docs/superpowers/specs/
 * 2026-11-11-contrato-formacao-fase2-design.md) — virou um botão + modal dentro de `ContratoSecao`
 * (ver `components/contrato-formacao-button.tsx`), pedido do Mateus pra não precisar de "outra
 * aba". Nenhum link do sistema aponta mais pra esta rota; fica só este redirect pra qualquer
 * favorito/link antigo cair na tela "Ver atleta" (onde o botão agora vive) em vez de dar erro ou
 * mostrar um formulário fora do lugar.
 */
export default async function ContratoFormacaoPage({ params }: { params: { id: string } }) {
  redirect(`/atletas/${params.id}/ver`);
}
