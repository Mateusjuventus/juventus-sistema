// Import relativo (não "@/...") de propósito: é o único import "de verdade" (não só de tipo) que
// este arquivo faz de outro módulo de lib/, e o alias "@/" não é resolvido pelo vitest (só o
// Next.js resolve — ver tsconfig.json). Os outros imports deste arquivo são só `import type`, que o
// esbuild elimina antes de precisar resolver o caminho, por isso nunca deu problema até agora.
import { TODAS_CATEGORIAS_BASE, type CategoriaBase } from "../auth/categorias-base";
import { normalizeCPF } from "@/lib/validation/cpf";
import type { CaptacaoBaseRow, CaptacaoDocumentoTipo, CaptacaoStatus } from "@/lib/supabase/types";

/**
 * Regras puras da Captação/Avaliação (ver docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md e 0077_captacao_atletas_separacao.sql) — rótulos/
 * cores do status, e as contagens que alimentam o dashboard (`/base/captacao/dashboard`). Nada aqui
 * toca banco, por isso é testável isoladamente.
 *
 * "inscricao" (quem chegou pelo link público e ainda não foi aprovado pra entrar em avaliação) fica
 * FORA de `CAPTACAO_STATUS_OPTIONS`/`contarPorStatus`/`taxaAprovacao` de propósito — esses três
 * continuam representando só os 4 status "decididos" (o funil pedido originalmente). A fila de
 * inscrições tem tela própria (`/base/captacao/aprovacoes`) e sua própria contagem
 * (`contarInscricoesPendentes`).
 */

export type CaptacaoStatusDecidido = Exclude<CaptacaoStatus, "inscricao">;

export const CAPTACAO_STATUS_OPTIONS: { value: CaptacaoStatusDecidido; label: string }[] = [
  { value: "avaliacao", label: "Em avaliação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "dispensado", label: "Dispensado" },
  { value: "nao_compareceu", label: "Não compareceu" },
];

export const CAPTACAO_STATUS_LABEL: Record<CaptacaoStatus, string> = {
  inscricao: "Inscrição enviada",
  avaliacao: "Em avaliação",
  aprovado: "Aprovado",
  dispensado: "Dispensado",
  nao_compareceu: "Não compareceu",
};

/** Cor da tag/badge de cada status — mesmo espírito das cores por categoria de posição já usadas
 * na Convocação (ver lib/futebol/categoria-posicao.ts). */
export const CAPTACAO_STATUS_COR: Record<CaptacaoStatus, string> = {
  inscricao: "bg-blue-100 text-blue-800",
  avaliacao: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  dispensado: "bg-neutral-100 text-neutral-500",
  nao_compareceu: "bg-red-100 text-red-700",
};

export function captacaoStatusLabel(status: CaptacaoStatus): string {
  return CAPTACAO_STATUS_LABEL[status];
}

export function corCaptacaoStatus(status: CaptacaoStatus): string {
  return CAPTACAO_STATUS_COR[status];
}

/** Quantos candidatos existem em cada status "decidido" (fora "inscricao") — base dos cartões do
 * dashboard. Sempre devolve as 4 chaves, mesmo com 0, pra o dashboard não precisar tratar
 * "undefined" na hora de exibir. */
export function contarPorStatus(
  candidatos: Pick<CaptacaoBaseRow, "status">[],
): Record<CaptacaoStatusDecidido, number> {
  const contagem: Record<CaptacaoStatusDecidido, number> = {
    avaliacao: 0,
    aprovado: 0,
    dispensado: 0,
    nao_compareceu: 0,
  };
  for (const c of candidatos) {
    if (c.status === "inscricao") continue;
    contagem[c.status] += 1;
  }
  return contagem;
}

/** Quantos candidatos estão na fila de "Aprovações" (inscritos pelo link público, aguardando o
 * Mateus aprovar e informar a Data de Início) — ver `/base/captacao/aprovacoes`. */
export function contarInscricoesPendentes(candidatos: Pick<CaptacaoBaseRow, "status">[]): number {
  return candidatos.filter((c) => c.status === "inscricao").length;
}

/** Quantos candidatos existem por categoria × status "decidido" — tabela do dashboard pedida em
 * 19/08 ("tipo uma tabela principal de quantos atletas em avaliação, dispensados, aprovados por
 * categoria"). Sempre devolve as 7 categorias (Sub20 a Sub11), mesmo com tudo zerado, pelo mesmo
 * motivo de `contarPorStatus`. Ignora quem não tem categoria preenchida (a Captação não exige) e
 * "inscricao" (só os 4 status decididos entram, igual `contarPorStatus`). */
export function contarPorCategoriaEStatus(
  candidatos: Pick<CaptacaoBaseRow, "status" | "categoria">[],
): Record<CategoriaBase, Record<CaptacaoStatusDecidido, number>> {
  const contagem = {} as Record<CategoriaBase, Record<CaptacaoStatusDecidido, number>>;
  for (const categoria of TODAS_CATEGORIAS_BASE) {
    contagem[categoria] = { avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 };
  }
  for (const c of candidatos) {
    if (c.status === "inscricao" || !c.categoria) continue;
    contagem[c.categoria][c.status] += 1;
  }
  return contagem;
}

/** Quantos candidatos vieram de cada UF — alimenta o mapa do Brasil do dashboard. Ignora quem não
 * tem UF preenchida (o campo é opcional na Captação). */
export function contarPorUf(candidatos: Pick<CaptacaoBaseRow, "uf">[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const c of candidatos) {
    const uf = (c.uf ?? "").trim().toUpperCase();
    if (!uf) continue;
    contagem[uf] = (contagem[uf] ?? 0) + 1;
  }
  return contagem;
}

/** Taxa de aprovação (aprovados / total decidido), usada como um dos cartões do dashboard. Ignora
 * quem ainda está "em avaliação" — decisão pendente não deveria contar contra nem a favor da taxa.
 * Devolve `null` quando ninguém foi decidido ainda (evita divisão por zero e um "0%" enganoso). */
export function taxaAprovacao(contagem: Record<CaptacaoStatusDecidido, number>): number | null {
  const decididos = contagem.aprovado + contagem.dispensado + contagem.nao_compareceu;
  if (decididos === 0) return null;
  return Math.round((contagem.aprovado / decididos) * 100);
}

/**
 * Monta o payload de update de status compartilhado por `mudarStatusCaptacao` (troca rápida na
 * lista/tela do candidato) e `salvarParecerCaptacao` (o Treinador salvando o Parecer Final) — os
 * dois precisam da MESMA regra pra Data de término: carimba com `hoje` só quando o novo status é um
 * resultado final (Aprovado/Dispensado/Não compareceu) e ainda não tem uma data de término salva
 * (não sobrescreve uma correção manual já feita); limpa a Data de término ao voltar pra "Em
 * avaliação" (reabrir), já que nesse caso a avaliação não terminou de verdade. Extraído aqui — ver
 * docs/superpowers/specs/2026-08-19-parecer-final-treinador-design.md — pra não duplicar a regra
 * nos dois lugares que trocam status.
 */
/** Os 5 documentos obrigatórios da inscrição pública (ver spec 2026-09-11-captacao-documentos-
 * termo-auto-cadastro-design.md, seção 2) — chave = `tipo` gravado em `captacao_documentos` (e
 * `name` do `<input type="file">` no formulário), valor = rótulo pra exibir (mensagem de erro na
 * inscrição, ou lista de documentos na tela interna do candidato). Ordem = a mesma da ficha física
 * original. Compartilhado entre `app/inscricao-captacao-base/actions.ts` (validação) e
 * `app/base/captacao/[id]/page.tsx` (exibição pra equipe) pra não duplicar os rótulos. */
export const CAPTACAO_DOCUMENTO_LABEL: Record<CaptacaoDocumentoTipo, string> = {
  rg_atleta: "Cópia do RG do atleta",
  rg_responsavel: "Cópia do RG do(s) responsável(is)",
  declaracao_escolar: "Declaração escolar",
  atestado_medico: "Atestado médico",
  eletrocardiograma: "Eletrocardiograma com laudo",
};

export function payloadMudancaStatusCaptacao(
  novoStatus: CaptacaoStatusDecidido,
  dataTerminoAtual: string | null,
  hoje: string,
): { status: CaptacaoStatusDecidido; data_termino: string | null } {
  if (novoStatus === "avaliacao") return { status: novoStatus, data_termino: null };
  return { status: novoStatus, data_termino: dataTerminoAtual ?? hoje };
}

/** Um candidato "elegível pra completar" precisa só destes 4 campos — genérico o bastante pra
 * `encontrarCandidatoParaCompletar` funcionar tanto com `CaptacaoBaseRow` completo (uso real) quanto
 * com objetos simples nos testes. */
interface CandidatoElegivel {
  id: string;
  cpf: string | null;
  data_nascimento: string | null;
  status: CaptacaoStatus;
  numero: number;
}

/**
 * Acha, entre candidatos "Em avaliação" (sem decisão ainda) com CPF preenchido, aquele cujo CPF
 * normalizado bate com o informado E cuja data de nascimento também bate — usado pela etapa de
 * "completar cadastro existente" do link público de inscrição (ver spec 2026-09-11-captacao-
 * completar-cadastro-cpf-design.md, decisões 2 e 3).
 *
 * Compara CPF **normalizado** dos dois lados porque o formulário interno (`app/base/captacao/
 * actions.ts`) só passou a normalizar o CPF ao salvar a partir desta mesma mudança — pode haver
 * registro anterior com pontuação.
 *
 * Devolve só `string | null` de propósito — nunca diferencia "não achou nenhum" de "achou mas a
 * data de nascimento não bate" nem de "achou mas já foi decidido" pro chamador. Quem decide o que
 * fazer com `null` é a Server Action, sempre com a mesma resposta genérica pro cliente
 * (anti-enumeração, decisão 4 da spec — evita que alguém use o formulário pra descobrir se um CPF
 * está cadastrado). Se mais de um candidato bater (caso raro), fica com o de maior `numero` (o mais
 * recente).
 */
export function encontrarCandidatoParaCompletar<T extends CandidatoElegivel>(
  candidatos: T[],
  cpfInformado: string,
  dataNascimentoInformada: string,
): string | null {
  const cpfNormalizado = normalizeCPF(cpfInformado);
  const elegiveis = candidatos.filter(
    (c) =>
      c.status === "avaliacao" &&
      !!c.cpf &&
      normalizeCPF(c.cpf) === cpfNormalizado &&
      c.data_nascimento === dataNascimentoInformada,
  );
  if (elegiveis.length === 0) return null;
  return elegiveis.reduce((maisRecente, atual) => (atual.numero > maisRecente.numero ? atual : maisRecente)).id;
}

/**
 * Outros períodos do mesmo atleta no clube — mesmo CPF normalizado, qualquer status, exceto o
 * próprio registro — do mais recente pro mais antigo (por `numero`). Alimenta a seção "Histórico"
 * da tela do candidato (ver spec 2026-09-11-captacao-completar-cadastro-cpf-design.md, seção 5):
 * um atleta que já passou pelo clube antes (Aprovado/Dispensado/Não compareceu) e volta pra uma
 * nova avaliação ganha um cadastro novo (não reabre o antigo — decisão 3), então isso é só
 * informativo, sem nenhum vínculo formal no banco. Lista vazia quando o candidato não tem CPF
 * preenchido (não dá pra comparar) ou ninguém mais bate.
 */
export function historicoPorCpf<T extends { id: string; cpf: string | null; numero: number }>(
  candidatos: T[],
  candidatoAtual: Pick<T, "id" | "cpf">,
): T[] {
  if (!candidatoAtual.cpf) return [];
  const cpfNormalizado = normalizeCPF(candidatoAtual.cpf);
  return candidatos
    .filter((c) => c.id !== candidatoAtual.id && !!c.cpf && normalizeCPF(c.cpf) === cpfNormalizado)
    .sort((a, b) => b.numero - a.numero);
}

/**
 * Campos em comum entre a Ficha de Avaliação pública (`captacaoInscricaoSchema`) e o cadastro
 * interno (`captacaoBaseSchema`) — tudo, exceto os dois campos onde os dois formulários usam
 * representações diferentes pro mesmo booleano ("Possui plano de saúde" e "É federado": o
 * formulário interno usa checkbox, "on"/"", o público usa `<select>`, "sim"/"nao") — cada chamador
 * decide o formato desses dois.
 *
 * Usado tanto pra reidratar o formulário interno na edição (`/base/captacao/[id]`) quanto pra
 * pré-preencher o formulário público quando alguém completa um cadastro existente pelo CPF (ver
 * spec 2026-09-11-captacao-completar-cadastro-cpf-design.md, seção 3) — assim os ~30 campos em
 * comum só têm um lugar pra manter, em vez de reescritos em cada tela.
 */
export function camposComunsCaptacao(candidato: CaptacaoBaseRow): Record<string, string> {
  return {
    nomeCompleto: candidato.nome_completo,
    dataNascimento: candidato.data_nascimento ?? "",
    posicao: candidato.posicao ?? "",
    categoria: candidato.categoria ?? "",
    indicacao: candidato.indicacao ?? "",
    clubeAnterior: candidato.clube_anterior ?? "",
    telefone: candidato.telefone ?? "",
    maeNome: candidato.mae_nome ?? "",
    maeTelefone: candidato.mae_telefone ?? "",
    paiNome: candidato.pai_nome ?? "",
    paiTelefone: candidato.pai_telefone ?? "",
    escola: candidato.escola ?? "",
    cep: candidato.cep ?? "",
    logradouro: candidato.logradouro ?? "",
    numero: candidato.numero_endereco ?? "",
    complemento: candidato.complemento ?? "",
    bairro: candidato.bairro ?? "",
    cidade: candidato.cidade ?? "",
    uf: candidato.uf ?? "",
    rg: candidato.rg ?? "",
    cpf: candidato.cpf ?? "",
    segundaPosicao: candidato.segunda_posicao ?? "",
    peDominante: candidato.pe_dominante ?? "",
    altura: candidato.altura?.toString() ?? "",
    peso: candidato.peso?.toString() ?? "",
    email: candidato.email ?? "",
    planoSaudeQual: candidato.plano_saude_qual ?? "",
    escolaridade: candidato.escolaridade ?? "",
    periodoEscolar: candidato.periodo_escolar ?? "",
    federadoClube: candidato.federado_clube ?? "",
  };
}
