/**
 * Cliente da API não-documentada da FPF (Federação Paulista de Futebol), descoberta por inspeção
 * de rede (ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md). Todos os endpoints
 * respondem no mesmo formato de envelope: { Codigo, Sucesso, Mensagem, Retorno, Total }.
 *
 * Endpoints com campos confirmados por captura real de rede (`ListarTabela`, `ListarRodadas`,
 * `ListarCompeticoesClube`): tipados com os campos exatos vistos na resposta.
 *
 * Endpoints de atleta (`ListarAtletas`, `ReadAtleta`, `ListarCampExercicioAtleta`,
 * `ListarJogosDisputados`): a existência e os parâmetros foram confirmados por captura de rede,
 * mas os nomes exatos dos campos dentro de `Retorno` NÃO foram — só vimos o resultado renderizado
 * na tela (nome, nascimento, número de registro etc.), não o JSON cru. Ficam tipados como
 * `Record<string, unknown>` de propósito, com uma função `normalizar*` isolada fazendo a extração
 * tolerante (tenta algumas variações plausíveis de nome de campo) — quando alguém rodar a primeira
 * sincronização de elenco de verdade, ajusta só essas funções `normalizar*`, sem mexer no resto.
 */

const BASE_URL = "https://futebolpaulista.com.br/Handlers/Competicoes";

export class FpfApiError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FpfApiError";
  }
}

interface FpfEnvelope<T> {
  Codigo: number;
  Sucesso: boolean;
  Mensagem: string;
  Retorno: T;
  Total: number;
}

/** GET com timeout curto e parse do envelope — toda chamada à FPF passa por aqui. */
async function fpfGet<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [chave, valor] of Object.entries(params)) {
    url.searchParams.set(chave, String(valor));
  }
  // cache-busting, igual o próprio site da FPF faz nas chamadas dele
  url.searchParams.set("_", String(Date.now()));

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        // O site da FPF respondeu 403 sem esses dois cabeçalhos (visto em produção, ver
        // docs/superpowers/specs/2026-08-04-integracao-fpf-design.md) — sem eles, a chamada não
        // parece um AJAX de verdade partindo da própria página deles (proteção comum em handlers
        // .ashx do ASP.NET contra chamada direta/hotlink). `Referer` aponta pra própria página de
        // Competições, e o `User-Agent` imita um navegador comum (o padrão do runtime Node/Vercel
        // costuma ser bloqueado).
        Referer: "https://futebolpaulista.com.br/Competicoes/Tabela.aspx",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
  } catch (erro) {
    throw new FpfApiError(`Falha de rede ao chamar ${endpoint}`, endpoint, erro);
  }

  if (!resposta.ok) {
    throw new FpfApiError(`${endpoint} respondeu HTTP ${resposta.status}`, endpoint);
  }

  let envelope: FpfEnvelope<T>;
  try {
    envelope = await resposta.json();
  } catch (erro) {
    throw new FpfApiError(`${endpoint} não devolveu JSON válido`, endpoint, erro);
  }

  if (!envelope.Sucesso) {
    throw new FpfApiError(`${endpoint}: ${envelope.Mensagem || "sucesso=false sem mensagem"}`, endpoint);
  }

  return envelope.Retorno;
}

// --- Campeonatos / clubes / rodadas / jogos (campos confirmados por captura real) ---

export interface FpfCampeonato {
  IdCampeonato: number;
  IdCategoria: number;
  Categoria: string;
  Campeonato: string;
  Ordem: number;
}

export async function listarTodosCampeonatos(): Promise<FpfCampeonato[]> {
  return fpfGet<FpfCampeonato[]>("ListarTodosCampeonatosExercicio.ashx", {});
}

export interface FpfClube {
  IdClube: number;
  NomePopular: string;
}

export async function listarCompeticoesClube(params: {
  idCampeonato: number;
  ano: number;
  rodada: number;
  idCategoria: number;
}): Promise<FpfClube[]> {
  return fpfGet<FpfClube[]>("ListarCompeticoesClube.ashx", {
    idCampeonato: params.idCampeonato,
    Ano: params.ano,
    Rodada: params.rodada,
    IdCategoria: params.idCategoria,
  });
}

export interface FpfRodada {
  Rodada: string;
}

export async function listarRodadas(params: {
  idCampeonato: number;
  ano: number;
  idCategoria: number;
}): Promise<FpfRodada[]> {
  return fpfGet<FpfRodada[]>("ListarRodadas.ashx", {
    IdCampeonato: params.idCampeonato,
    Ano: params.ano,
    IdCategoria: params.idCategoria,
  });
}

/** Um jogo dentro de `listTabela` — campos exatos vistos numa captura real (ver spec). Só os
 * campos que a integração de fato usa estão listados; a resposta real tem mais. */
export interface FpfJogo {
  IdJogo: number;
  Data: string; // "DD/MM/AAAA"
  Horario: string; // "HHhMM"
  Rodada: number;
  Fase: string;
  Grupo: string;
  IdCampeonato: number;
  IdCategoria: number;
  NomePopularMandante: string;
  NomePopularVisitante: string;
  ResultadoMandante: number | null;
  ResultadoVisitante: number | null;
  Estadio: string;
  Municipio: string;
  LinkSumula: string | null;
  Adiado: boolean;
}

export interface FpfTabela {
  listTabela: FpfJogo[];
}

export async function listarTabela(params: {
  idCampeonato: number;
  ano: number;
  rodada: number;
  idClube: number; // 0 = todos os clubes da rodada
  idCategoria: number;
}): Promise<FpfTabela> {
  return fpfGet<FpfTabela>("ListarTabela.ashx", {
    IdCampeonato: params.idCampeonato,
    Ano: params.ano,
    Rodada: params.rodada,
    IdClube: params.idClube,
    IdCategoria: params.idCategoria,
  });
}

/** Busca todos os jogos de um clube numa competição/temporada, percorrendo rodada por rodada
 * (sequencial, sem paralelismo agressivo — ver seção "Tratamento de erro e confiabilidade" da
 * spec). */
export async function listarTodosOsJogosDoClube(params: {
  idCampeonato: number;
  ano: number;
  idClube: number;
  idCategoria: number;
}): Promise<FpfJogo[]> {
  const rodadas = await listarRodadas({
    idCampeonato: params.idCampeonato,
    ano: params.ano,
    idCategoria: params.idCategoria,
  });

  const jogos: FpfJogo[] = [];
  for (const { Rodada } of rodadas) {
    const numeroRodada = Number(Rodada);
    if (!Number.isFinite(numeroRodada)) continue;
    const { listTabela } = await listarTabela({
      idCampeonato: params.idCampeonato,
      ano: params.ano,
      rodada: numeroRodada,
      idClube: params.idClube,
      idCategoria: params.idCategoria,
    });
    jogos.push(...listTabela);
  }
  return jogos;
}

// --- Atletas (parâmetros confirmados, nomes de campo do Retorno AINDA NÃO confirmados) ---

/** Elenco de um clube. Campos exatos de cada item ainda não confirmados por captura real — só
 * sabemos, pela tela do site, que cada atleta tem um id interno e um nome. Ajustar
 * `normalizarAtletaFpf` assim que uma captura real estiver disponível. */
export async function listarAtletasDoClube(idClube: number): Promise<Record<string, unknown>[]> {
  return fpfGet<Record<string, unknown>[]>("ListarAtletas.ashx", { IdClube: idClube });
}

export interface FpfAtletaNormalizado {
  idAtleta: number;
  nome: string;
  numeroRegistro: string | null;
  dataNascimento: string | null;
}

/** Extração tolerante a variação de nome de campo — ver aviso no topo do arquivo. */
export function normalizarAtletaFpf(bruto: Record<string, unknown>): FpfAtletaNormalizado | null {
  const idAtleta = Number(bruto.IdAtleta ?? bruto.Id ?? bruto.idAtleta);
  const nome = String(bruto.NomeCompleto ?? bruto.Nome ?? bruto.NomePopular ?? "").trim();
  if (!Number.isFinite(idAtleta) || !nome) return null;

  const numeroRegistro = bruto.NumeroRegistro ?? bruto.RegistroContrato ?? bruto.NumeroContrato ?? null;
  const dataNascimento = bruto.DataNascimento ?? bruto.Nascimento ?? null;

  return {
    idAtleta,
    nome,
    numeroRegistro: numeroRegistro != null ? String(numeroRegistro) : null,
    dataNascimento: dataNascimento != null ? String(dataNascimento) : null,
  };
}

export async function lerAtleta(idAtleta: number): Promise<Record<string, unknown>> {
  return fpfGet<Record<string, unknown>>("ReadAtleta.ashx", { IdAtleta: idAtleta });
}

export async function listarJogosDisputados(params: {
  idAtleta: number;
  idCampeonato: number;
  ano: number;
}): Promise<Record<string, unknown>[]> {
  return fpfGet<Record<string, unknown>[]>("ListarJogosDisputados.ashx", {
    IdAtleta: params.idAtleta,
    IdCampeonato: params.idCampeonato,
    Ano: params.ano,
  });
}

// --- Classificação / artilharia (endpoint e campos AINDA NÃO confirmados por captura de rede) ---
//
// A existência dessas telas foi confirmada visualmente (abas "CLASSIFICAÇÃO" e "ARTILHARIA" no
// site), mas nunca inspecionamos a chamada de rede por trás delas — os nomes de endpoint abaixo
// são um palpite seguindo o mesmo padrão dos outros (`Listar<Coisa>.ashx`). Se estiver errado, a
// chamada simplesmente falha (404 ou Sucesso=false) e a página mostra erro de forma isolada, sem
// derrubar o resto — ver `app/jogos/fpf/competicao/page.tsx`. Confirmar com uma captura de rede
// real assim que possível e corrigir aqui.

export async function listarClassificacao(params: {
  idCampeonato: number;
  ano: number;
  idCategoria: number;
}): Promise<Record<string, unknown>[]> {
  return fpfGet<Record<string, unknown>[]>("ListarClassificacao.ashx", {
    IdCampeonato: params.idCampeonato,
    Ano: params.ano,
    IdCategoria: params.idCategoria,
  });
}

export async function listarArtilharia(params: {
  idCampeonato: number;
  ano: number;
  idCategoria: number;
}): Promise<Record<string, unknown>[]> {
  return fpfGet<Record<string, unknown>[]>("ListarArtilharia.ashx", {
    IdCampeonato: params.idCampeonato,
    Ano: params.ano,
    IdCategoria: params.idCategoria,
  });
}
