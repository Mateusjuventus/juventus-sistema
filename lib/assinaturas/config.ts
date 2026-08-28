/**
 * Configuração central de "quem assina o quê" (ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md) — cada tipo de documento declara aqui só a
 * LISTA de papéis que espera (rótulo pra mostrar na tela/PDF). Quem de fato PODE assinar cada papel
 * fica a critério de cada tela (normalmente: quem criou o documento auto-assina o papel dela; o
 * outro papel fica pendente até a pessoa certa entrar e confirmar) — não precisa estar aqui, porque
 * varia demais de documento pra documento pra caber numa regra só.
 *
 * Tela e PDF sempre leem esses papéis DAQUI, nunca inventam a própria lista — é o que garante que
 * os dois nunca mostram números diferentes de assinantes esperados.
 */

export type TipoDocumento = "dispensa_base" | "parecer_captacao_base" | "orcamento_jogo" | "despesas_jogo";

export interface PapelEsperado {
  /** Chave estável gravada em `assinaturas_documento.papel` — nunca muda depois de criada. */
  papel: string;
  /** Texto mostrado na tela e no PDF (mesmo rótulo que já existia na linha em branco de hoje). */
  rotulo: string;
}

const PAPEIS_FIXOS: Partial<Record<TipoDocumento, PapelEsperado[]>> = {
  dispensa_base: [
    { papel: "treinador", rotulo: "Treinador / Responsável pela avaliação" },
    { papel: "departamento", rotulo: "Departamento de Futebol de Base" },
  ],
};

/**
 * Papéis fixos, conhecidos sem consultar nenhuma tabela de configuração — hoje só `dispensa_base`.
 * Documentos com assinantes CONFIGURÁVEIS (Financeiro, Parecer Final) montam a própria lista na
 * hora com `papeisAssinaturaFinanceiro`/`papeisAssinaturaParecer` abaixo, porque o rótulo (cargo) e
 * a quantidade variam conforme a configuração salva — não têm como caber num mapa estático aqui.
 */
export function papeisEsperados(tipoDocumento: TipoDocumento): PapelEsperado[] {
  return PAPEIS_FIXOS[tipoDocumento] ?? [];
}

/**
 * Monta os 2 papéis fixos (`assinatura1`/`assinatura2`) do Financeiro (Orçamento Pré-Jogo e
 * Relatório de Despesas do jogo) a partir da configuração atual — o rótulo mostrado é o cargo
 * configurado (ex. "Supervisor de Futebol"), pra quem ainda não assinou saber quem é esperado ali.
 */
export function papeisAssinaturaFinanceiro(config: {
  assinatura1Cargo: string;
  assinatura2Cargo: string;
}): PapelEsperado[] {
  return [
    { papel: "assinatura1", rotulo: config.assinatura1Cargo || "Assinatura 1" },
    { papel: "assinatura2", rotulo: config.assinatura2Cargo || "Assinatura 2" },
  ];
}

/**
 * Monta a lista (tamanho variável) de papéis do Parecer Final de Avaliação a partir da
 * configuração atual de `configuracoes_parecer_captacao_base.assinaturas` — cada linha configurada
 * vira um papel, identificado pelo `id` estável da linha (não pelo índice: reordenar ou adicionar
 * uma linha no meio não pode fazer uma assinatura já feita "pular" pra outra pessoa). Linhas ainda
 * sem nome preenchido (configuração em branco) não viram papel — não faz sentido pedir assinatura
 * de um espaço vazio.
 */
export function papeisAssinaturaParecer(
  config: { id: string; nome: string; cargo: string }[],
): PapelEsperado[] {
  return config
    .filter((c) => c.nome.trim().length > 0)
    .map((c) => ({ papel: c.id, rotulo: c.cargo || c.nome }));
}

/**
 * Decide se o usuário logado pode assinar um papel configurável (Financeiro/Parecer): se o papel
 * tem um usuário vinculado na configuração, só essa pessoa pode assinar; se ainda não tem ninguém
 * vinculado (configuração antiga, não ajustada), qualquer "master" pode — fallback que evita
 * travar quem já usava a configuração sem saber desse vínculo novo.
 */
export function podeAssinarPapel(
  usuarioVinculado: string | null | undefined,
  usuarioAtualId: string,
  master: boolean,
): boolean {
  return usuarioVinculado ? usuarioVinculado === usuarioAtualId : master;
}
