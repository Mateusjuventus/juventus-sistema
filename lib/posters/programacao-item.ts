/**
 * Uma linha de cronograma já pronta pra desenhar (Concentração ou Dia de Jogo) — a mesma forma é
 * usada pelo PDF (`lib/pdf/concentracao-document.tsx`, `lib/pdf/dia-jogo-document.tsx`) e pelo JPG
 * (`lib/posters/concentracao-imagem.tsx`, `lib/posters/dia-jogo-imagem.tsx`). Quando a linha é
 * `eh_confronto` no banco, `atividade` aqui já vem preenchida com o texto do confronto (ex:
 * "JUVENTUS X FERROVIÁRIA") — os componentes de desenho não sabem nem precisam saber dessa regra.
 */
export interface ItemProgramacaoTexto {
  horario: string;
  atividade: string;
  local: string;
}
