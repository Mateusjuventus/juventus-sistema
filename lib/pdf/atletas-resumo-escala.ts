/**
 * Escala dos cards do PDF de Atletas — fixa em 1 (tamanho de referência sempre cheio) desde
 * 2026-09-10. Até então essa função encolhia os cards proporcionalmente pra caber qualquer elenco
 * numa única folha A4 (pedido original do Mateus: "tudo numa única página"), no mesmo espírito do
 * `calcularEscala` do Campograma (`lib/pdf/campograma-document.tsx`). O próprio Mateus voltou atrás
 * nisso depois de ver elencos grandes com cards pequenos demais: "pode jogar mais atletas para
 * baixo se precisar... pra que aumente eles" — ou seja, card grande importa mais que caber numa
 * página só. Como nenhuma `View` do documento usa `wrap={false}` no nível da grade (só cada card
 * individual, pra ele não ser cortado ao meio por uma quebra de página), o react-pdf já pagina
 * sozinho quando os cards estouram a altura da folha — e o rodapé (`DocumentoFooter`, `fixed`) se
 * repete em toda página gerada, então nada precisa mudar em `atletas-resumo-document.tsx` além de
 * parar de encolher.
 *
 * Mantida como função (em vez de sumir e deixar o tamanho de referência solto no documento) só pra
 * não precisar mexer em `atletas-resumo-document.tsx` de novo caso um piso de legibilidade volte a
 * ser necessário no futuro (elenco absurdamente grande, por exemplo) — mesmo raciocínio de manter
 * a lógica isolada e testável do Campograma.
 */

export function calcularEscalaCardsAtletas(_totalAtletas: number): number {
  return 1;
}
