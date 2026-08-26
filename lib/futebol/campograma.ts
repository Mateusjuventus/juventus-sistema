import type { AtletaClassificacao, AtletaPosicao } from "@/lib/supabase/types";

/**
 * Dados e agrupamento puro do Campograma (`/base/atletas/campograma`) — o elenco de uma categoria
 * separado por posição, no estilo de um relatório de elenco (ver docs/superpowers/specs/
 * 2026-08-26-campograma-foto-classificacao-design.md). Não é a escalação de um jogo específico: é o
 * elenco inteiro da categoria, visto por posição — quantos zagueiros o Sub-17 tem, por exemplo.
 *
 * Até essa spec o agrupamento era pelas 5 categorias derivadas (goleiro/zagueiro/lateral/meia/
 * atacante, ver `categoriaDaPosicao` em `lib/futebol/categoria-posicao.ts`). Agora cada uma das 9
 * posições específicas de `AtletaPosicao` vira sua própria linha — mesmo nível de detalhe da
 * referência do relatório do Corinthians, e sem a ambiguidade que uma categoria agrupada teria pro
 * arrastar-e-soltar (ver `components/campograma-elenco.tsx`): "Lateral" poderia ser Direito ou
 * Esquerdo, mas cada posição específica já é uma linha só.
 */

export interface AtletaCampograma {
  id: string;
  nome: string;
  apelido: string | null;
  /** Posição específica cadastrada (uma das 9 de `AtletaPosicao`) — `null`/valor não reconhecido só
   * em cadastros muito antigos, vai pro grupo auxiliar `sem_posicao`. */
  posicao: string | null;
  fotoUrl: string | null;
  classificacao: AtletaClassificacao | null;
  tipoContrato: string | null;
  /** Data de nascimento em ISO (aaaa-mm-dd), formatada na exibição — ver `formatarDataBrCampograma`. */
  dataNascimento: string | null;
}

/** Ordem de exibição das 9 linhas, do ataque (topo) pro gol (base) — mesmo espírito de "o olho lê
 * como uma escalação" do campograma anterior, decisão confirmada com o Mateus na spec. */
export const ORDEM_POSICOES_CAMPOGRAMA: AtletaPosicao[] = [
  "Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
  "Volante",
  "Meia",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Zagueiro",
  "Goleiro",
];

const POSICOES_VALIDAS = new Set<string>(ORDEM_POSICOES_CAMPOGRAMA);

export type GrupoCampograma = Record<AtletaPosicao | "sem_posicao", AtletaCampograma[]>;

/** Nome curto pra mostrar no token — apelido quando existir, senão o primeiro nome. */
export function nomeCampograma(atleta: Pick<AtletaCampograma, "nome" | "apelido">): string {
  if (atleta.apelido && atleta.apelido.trim()) return atleta.apelido.trim();
  return atleta.nome.trim().split(" ")[0] ?? atleta.nome;
}

/** Agrupa por posição específica, cada grupo ordenado por nome. Atleta sem posição reconhecida
 * (só cadastros muito antigos, ver `categoriaDaPosicao`) vai pro grupo auxiliar `sem_posicao` — não
 * é arrastável, já que não tem uma linha de origem definida. */
export function agruparPorPosicaoEspecifica(atletas: AtletaCampograma[]): GrupoCampograma {
  const grupos = Object.fromEntries([
    ...ORDEM_POSICOES_CAMPOGRAMA.map((posicao) => [posicao, [] as AtletaCampograma[]]),
    ["sem_posicao", [] as AtletaCampograma[]],
  ]) as GrupoCampograma;

  for (const a of atletas) {
    const chave = a.posicao && POSICOES_VALIDAS.has(a.posicao) ? (a.posicao as AtletaPosicao) : "sem_posicao";
    grupos[chave].push(a);
  }

  for (const chave of Object.keys(grupos) as (keyof GrupoCampograma)[]) {
    grupos[chave].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  return grupos;
}

/** Selo de tipo de contrato (P/F) do token do atleta — ver spec, seção "O token de cada atleta". O
 * sistema usa Definitivo/Empréstimo/Amador/Iniciação (não "Profissional/Formação" como na
 * referência do Corinthians), então o mapeamento é definitivo/emprestimo → P, amador/iniciacao → F.
 * Atleta sem tipo de contrato cadastrado não mostra selo nenhum. */
export type SeloContratoAtleta = "P" | "F" | null;

export function seloContratoAtleta(tipoContrato: string | null | undefined): SeloContratoAtleta {
  if (tipoContrato === "definitivo" || tipoContrato === "emprestimo") return "P";
  if (tipoContrato === "amador" || tipoContrato === "iniciacao") return "F";
  return null;
}

/** Contagem de atletas por posição, na mesma ordem de exibição das linhas — alimenta o gráfico de
 * radar (um eixo por posição), tanto na tela quanto no PDF. */
export interface ContagemPosicaoCampograma {
  posicao: AtletaPosicao;
  quantidade: number;
}

export function contarPorPosicaoCampograma(grupos: GrupoCampograma): ContagemPosicaoCampograma[] {
  return ORDEM_POSICOES_CAMPOGRAMA.map((posicao) => ({ posicao, quantidade: grupos[posicao].length }));
}

export interface PontoRadar {
  x: number;
  y: number;
}

/** Ponto na borda de um círculo de raio `raio` centrado em `centro`, na posição angular do eixo
 * `indice` de `total` eixos igualmente espaçados — o primeiro eixo (índice 0) sempre aponta pra
 * cima (12h), os demais seguem no sentido horário. Geometria pura, sem depender de SVG do DOM nem
 * do react-pdf — reaproveitada pelo gráfico de radar tanto na tela quanto no PDF (linhas dos eixos e
 * anéis de fundo). */
export function calcularPontoAngular(
  indice: number,
  total: number,
  centro: PontoRadar,
  raio: number,
): PontoRadar {
  const angulo = -Math.PI / 2 + (2 * Math.PI * indice) / total;
  return { x: centro.x + raio * Math.cos(angulo), y: centro.y + raio * Math.sin(angulo) };
}

/** Pontos do polígono de dados do gráfico de radar de posições — um por posição, na mesma ordem de
 * `contagens`. Escala relativa (ver spec): a posição com mais atletas define a borda externa (fator
 * 1, no raio máximo); as demais são proporcionais a ela. Com elenco vazio (todas as contagens em 0)
 * o maior valor considerado é 1, então todos os pontos ficam no centro — sem divisão por zero. */
export function calcularPontosRadar(
  contagens: ContagemPosicaoCampograma[],
  centro: PontoRadar,
  raio: number,
): PontoRadar[] {
  const max = Math.max(1, ...contagens.map((c) => c.quantidade));
  return contagens.map((c, i) => calcularPontoAngular(i, contagens.length, centro, raio * (c.quantidade / max)));
}
