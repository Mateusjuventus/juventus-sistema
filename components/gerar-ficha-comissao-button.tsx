/**
 * Botão "Gerar ficha" na tela "Ver" da Comissão Técnica/Diretoria — pedido do Mateus em 14/11/2026
 * (item 8, ponto 5). Diferente de `GerarFichaAtletaButton` (components/atletas/gerar-ficha-atleta-
 * button.tsx), que abre um modal de seleção de campos/Dados de Jogo/Competições: aqui a ficha é
 * sempre completa e não há nada pra filtrar (sem jogos, sem anotações, sem histórico), então é só
 * um link direto pra rota do PDF — sem estado, sem Client Component.
 */
export function GerarFichaComissaoButton({ id }: { id: string }) {
  return (
    <a href={`/comissao-tecnica/${id}/ficha/pdf`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
      Gerar ficha
    </a>
  );
}
