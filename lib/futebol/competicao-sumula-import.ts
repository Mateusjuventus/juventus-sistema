import type { SumulaPdfCartao, SumulaPdfDados } from "@/lib/fpf/sumula-pdf";

/**
 * Aproveita a súmula oficial da FPF (PDF) nos jogos dos GRUPOS: o usuário cola o link e o sistema
 * extrai placar e cartões de cada lado, em vez de digitar tudo à mão. É o mesmo leitor da aba
 * Súmula do jogo do Juventus (`lib/fpf/sumula-pdf.ts`) — aqui só o que interessa pra
 * classificação (placar + cartões por equipe), já que jogo entre outros clubes não vira evento
 * de súmula no sistema.
 *
 * Funções puras (o download/parsing acontece na Server Action) — dá pra testar.
 */

/** Normaliza nome de equipe pra comparação tolerante: sem acento, sem caixa, sem pontuação e sem
 * as palavras genéricas que a súmula às vezes traz ("EC", "FC", "SC", "AA", "clube"...). */
export function normalizarEquipe(nome: string): string {
  const semAcento = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const semRuido = semAcento
    .replace(/[^a-z0-9\s]/g, " ")
    // Siglas soltas ("E.C." vira "e c" depois da limpeza de pontuação) e sufixos genéricos.
    .replace(/\b[a-z]\b/g, " ")
    .replace(
      /\b(ec|fc|sc|aa|ad|ca|se|esporte|esportivo|clube|futebol|associacao|atletico|sociedade|saf|ltda)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return semRuido || semAcento.replace(/\s+/g, " ").trim();
}

/**
 * Decide a qual das duas equipes um nome vindo da súmula corresponde. Compara o nome normalizado
 * por continência nos dois sentidos ("Osasco" ↔ "Osasco Sporting Club") e, se ainda empatar, pela
 * maior quantidade de palavras em comum. Devolve null quando não dá pra decidir.
 */
export function equipeCorrespondente(nomeNaSumula: string, equipeA: string, equipeB: string): "A" | "B" | null {
  const alvo = normalizarEquipe(nomeNaSumula);
  const a = normalizarEquipe(equipeA);
  const b = normalizarEquipe(equipeB);
  if (!alvo) return null;

  const contem = (x: string, y: string) => x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
  const casaA = contem(alvo, a);
  const casaB = contem(alvo, b);
  if (casaA && !casaB) return "A";
  if (casaB && !casaA) return "B";

  const palavras = (s: string) => new Set(s.split(" ").filter((p) => p.length > 2));
  const emComum = (x: string, y: string) => {
    const px = palavras(x);
    return Array.from(palavras(y)).filter((p) => px.has(p)).length;
  };
  const pontosA = emComum(alvo, a);
  const pontosB = emComum(alvo, b);
  if (pontosA > pontosB) return "A";
  if (pontosB > pontosA) return "B";
  return null;
}

export interface CartoesPorLado {
  amarelosA: number;
  vermelhosA: number;
  amarelosB: number;
  vermelhosB: number;
  /** Nomes de equipe da súmula que não bateram com nenhum dos dois lados — mostrados ao usuário
   * pra ele conferir/completar à mão, em vez de sumirem em silêncio. */
  naoIdentificados: string[];
}

export function contarCartoesPorLado(
  cartoes: SumulaPdfCartao[],
  equipeA: string,
  equipeB: string,
): CartoesPorLado {
  const resultado: CartoesPorLado = {
    amarelosA: 0,
    vermelhosA: 0,
    amarelosB: 0,
    vermelhosB: 0,
    naoIdentificados: [],
  };

  for (const cartao of cartoes) {
    const lado = equipeCorrespondente(cartao.equipe, equipeA, equipeB);
    if (lado === null) {
      if (!resultado.naoIdentificados.includes(cartao.equipe)) resultado.naoIdentificados.push(cartao.equipe);
      continue;
    }
    if (cartao.cor === "amarelo") {
      if (lado === "A") resultado.amarelosA += 1;
      else resultado.amarelosB += 1;
    } else {
      if (lado === "A") resultado.vermelhosA += 1;
      else resultado.vermelhosB += 1;
    }
  }

  return resultado;
}

/**
 * A súmula traz a data como dd/mm/aaaa (ver `RE_DATA` em lib/fpf/sumula-pdf.ts), mas a coluna
 * `data_jogo` é `date` — gravar o texto brasileiro direto dava
 * "date/time field value out of range". Converte pra ISO; devolve null se não reconhecer.
 */
export function dataSumulaParaIso(data: string | null): string | null {
  if (!data) return null;
  const jaIso = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (jaIso) return data;
  const br = data.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!br) return null;
  const [, dia, mes, ano] = br;
  const diaNum = Number(dia);
  const mesNum = Number(mes);
  if (mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) return null;
  return `${ano}-${mes}-${dia}`;
}

export interface ResultadoImportado {
  golsCasa: number;
  golsFora: number;
  cartoes: CartoesPorLado;
  rodada: string | null;
  data: string | null;
  avisos: string[];
}

/**
 * Monta o resultado de um jogo de grupo a partir da súmula já parseada. `equipeCasa`/`equipeFora`
 * são as equipes que o usuário escolheu no formulário — o placar da súmula é
 * mandante × visitante, então casa = mandante.
 *
 * Quando o PDF não traz o placar (campo "Resultado" ausente), cai na contagem de gols da própria
 * súmula, atribuindo cada gol ao lado correto (gol contra conta pro adversário de quem marcou).
 */
export function montarResultadoImportado(
  dados: SumulaPdfDados,
  equipeCasa: string,
  equipeFora: string,
): ResultadoImportado {
  const avisos: string[] = [];
  let golsCasa = dados.placarMandante;
  let golsFora = dados.placarVisitante;

  if (golsCasa === null || golsFora === null) {
    let casa = 0;
    let fora = 0;
    for (const gol of dados.gols) {
      const lado = equipeCorrespondente(gol.equipe, equipeCasa, equipeFora);
      if (lado === null) {
        avisos.push(`Gol de "${gol.equipe}" não pôde ser atribuído a nenhuma das duas equipes.`);
        continue;
      }
      // Gol contra conta pro adversário de quem marcou.
      const paraCasa = gol.tipo === "contra" ? lado === "B" : lado === "A";
      if (paraCasa) casa += 1;
      else fora += 1;
    }
    golsCasa = casa;
    golsFora = fora;
    avisos.push("O PDF não trazia o placar final — contamos pelos gols da súmula. Confira antes de salvar.");
  }

  const cartoes = contarCartoesPorLado(dados.cartoes, equipeCasa, equipeFora);
  if (cartoes.naoIdentificados.length > 0) {
    avisos.push(
      `Cartões de ${cartoes.naoIdentificados.join(", ")} não foram atribuídos — confira os nomes das equipes do grupo.`,
    );
  }
  if (dados.avisos.length > 0) {
    avisos.push(`${dados.avisos.length} linha(s) do PDF não foram reconhecidas.`);
  }

  const dataIso = dataSumulaParaIso(dados.data);
  if (dados.data && !dataIso) {
    avisos.push(`A data "${dados.data}" do PDF não foi reconhecida — preencha a data à mão se precisar.`);
  }

  return { golsCasa, golsFora, cartoes, rodada: dados.rodada, data: dataIso, avisos };
}
