import { z } from "zod";
import { isValidCPF, normalizeCPF } from "./cpf";
import { isValidTelefone } from "./telefone";
import { chavePixValida } from "./chave-pix";
import { normalizarNomeProprio } from "./nome";

/** Regra de CPF compartilhada por todos os cadastros: 11 dígitos, dígito verificador válido. */
export const cpfField = z
  .string()
  .transform(normalizeCPF)
  .refine((value) => value.length === 11, { message: "CPF deve ter 11 dígitos" })
  .refine(isValidCPF, { message: "CPF inválido" });

const rgField = z.string().min(1, { message: "RG é obrigatório" });

const telefoneField = z.string().optional().or(z.literal(""));

/** Telefone validado no formato (10 ou 11 dígitos) quando preenchido — usado nos cadastros de
 * Comissão Técnica (Profissional e Base), que ganharam campo com máscara em tempo real (ver
 * `components/telefone-field.tsx`). Continua opcional no cadastro manual do admin; só é obrigatório
 * no link público (ver `cadastroPublicoComissaoTecnicaSchema` mais abaixo). Diferente do
 * `telefoneField` genérico (usado pelo resto do sistema, sem campo com máscara ainda), por isso não
 * reaproveitamos o mesmo campo aqui. */
export const telefoneFieldValidado = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || isValidTelefone(value), { message: "Telefone inválido" });

export const emailField = z.string().email({ message: "E-mail inválido" }).optional().or(z.literal(""));

/** Tipos de chave PIX oferecidos no cadastro de Staff Operacional (interno e público), nas
 * Solicitações de Pagamento/Reembolso e nos Recibos de Jogos — mesma lista em todo lugar que tem
 * um par Tipo de chave PIX/Chave PIX (ver components/chave-pix-field.tsx). */
export const STAFF_CHAVE_PIX_TIPOS = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Aleatória" },
] as const;

const chavePixTipoField = z
  .enum(["cpf", "cnpj", "email", "telefone", "aleatoria"])
  .optional()
  .or(z.literal(""));

/** Campos de endereço compartilhados entre o cadastro interno e o formulário público de Staff (e,
 * desde a Captação/Avaliação da Base, também o Atleta — ver `atletaBaseSchema` e
 * `captacaoBaseSchema`). Exportado pra ser reaproveitado por schemas de outros cadastros. */
export const enderecoFields = {
  cep: z.string().optional().or(z.literal("")),
  logradouro: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  uf: z.string().optional().or(z.literal("")),
};

/** Tipo de contrato do Futebol Profissional — ver `AtletaTipoContrato` em `lib/supabase/types.ts`.
 * "Formação" migrou de sub-flag de "Amador" (`possuiContratoFormacao`) pra valor próprio em
 * 2026-09-10 (ver supabase/migrations/0097_atleta_contrato_formacao_tipo.sql) — o campo antigo
 * continua existindo pra registros legados, mas só faz sentido escolher "Formação" direto daqui em
 * diante. */
export const ATLETA_TIPO_CONTRATO_OPTIONS = [
  { value: "definitivo", label: "Definitivo" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "amador", label: "Amador" },
  { value: "formacao", label: "Formação" },
] as const;

/** Tipo de contrato do Futebol de Base — mesmas opções do Profissional, mais Iniciação. */
export const ATLETA_BASE_TIPO_CONTRATO_OPTIONS = [
  ...ATLETA_TIPO_CONTRATO_OPTIONS,
  { value: "iniciacao", label: "Iniciação" },
] as const;

/** Tamanho de uniforme (Dados esportivos do atleta) — lista fixa pedida pelo Mateus em 2026-10-16. */
export const TAMANHO_UNIFORME_OPTIONS = ["PP", "P", "M", "G", "GG", "XG"] as const;

/**
 * Lista fixa de posição — um campo só, substituindo os antigos "Posição" (texto livre) +
 * "Categoria de posição" (5 grupos). O valor gravado é o próprio texto legível (não um código),
 * porque é assim que o campo já é lido hoje em ~50 lugares do sistema (listagens, PDFs,
 * exportações) — trocar pra um código exigiria traduzir em todos esses lugares. A tag colorida
 * GOL/ZAG/LAT/MEI/ATA da Convocação e o agrupamento do Campograma continuam existindo, mas agora
 * calculados a partir desta posição — ver `categoriaDaPosicao` em `lib/futebol/categoria-posicao.ts`.
 */
export const ATLETA_POSICAO_OPTIONS = [
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meia",
  "Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
] as const;

const posicaoField = z.enum(ATLETA_POSICAO_OPTIONS, {
  errorMap: () => ({ message: "Posição é obrigatória" }),
});

/** `telefoneFieldValidado` (definido acima, já usado pela Comissão Técnica) é reaproveitado no
 * Atleta pro telefone do próprio atleta e, no Base, da mãe/pai também (ver
 * docs/superpowers/specs/2026-08-25-atleta-telefone-alergia-foto-design.md — "telefone pai e mãe,
 * deixar essa máscara"). O telefone do empresário/representante NÃO usa esse campo: continua
 * `telefoneField` (texto livre), porque pode receber "Não possui". */

/** Exige `Boolean(data.alergiaMedicamentoQual?.trim())` quando `possuiAlergiaMedicamento` é
 * `true` — aplicado tanto em `atletaSchema` quanto em `atletaBaseSchema` via `.refine()` direto
 * (evita passar por uma função genérica: um `T extends z.ZodType<...>` faz o TypeScript inferir o
 * schema resultante como o tipo estreito do *constraint*, perdendo os demais campos — mais simples
 * repetir o mesmo `.refine()` nos dois lugares do que lutar contra a inferência). */
const refinoAlergia = {
  check: (data: { possuiAlergiaMedicamento: boolean; alergiaMedicamentoQual?: string }) =>
    !data.possuiAlergiaMedicamento || Boolean(data.alergiaMedicamentoQual?.trim()),
  options: { message: "Informe qual é a alergia", path: ["alergiaMedicamentoQual"] },
};

/** Segundo endereço estruturado do atleta ("Endereço de origem", pedido de 2026-10-16) — mesmo
 * formato de `enderecoFields`, com prefixo "origem" pras chaves não colidirem com o endereço atual
 * no mesmo formulário. Ver docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md. */
const origemEnderecoFields = {
  origemCep: z.string().optional().or(z.literal("")),
  origemLogradouro: z.string().optional().or(z.literal("")),
  origemNumero: z.string().optional().or(z.literal("")),
  origemComplemento: z.string().optional().or(z.literal("")),
  origemBairro: z.string().optional().or(z.literal("")),
  origemCidade: z.string().optional().or(z.literal("")),
  origemUf: z.string().optional().or(z.literal("")),
};

/** Cadastro de Atleta — único formulário/schema pro Futebol Profissional e pro Futebol de Base
 * desde a unificação de 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-
 * design.md). Até então existiam `atletaSchema` (Profissional) e `atletaBaseSchema` (Base,
 * estendendo um `atletaCamposBase` cru por causa da limitação de `.extend()` num `ZodObject` já
 * `.refine()`ado) — ambos foram colapsados aqui porque todo atleta agora mora na mesma tabela
 * `atletas`, com `categoria` decidindo quais campos a tela mostra: os "Base-only" abaixo
 * (email do pai/mãe, alojamento/ajuda de custo/agência/escola, responsáveis) continuam existindo
 * no banco pra qualquer categoria (ver `AtletaRow` em lib/supabase/types.ts), mas o formulário
 * (`AtletaForm`) só os exibe quando a categoria escolhida é uma categoria da Base — o `.safeParse`
 * aqui não distingue por categoria, então um envio do Profissional sempre chega com esses campos
 * vazios/`undefined`, o que já é válido (todos opcionais). RG/CPF/data de nascimento são
 * obrigatórios pras duas categorias, sem exceção. */
export const atletaSchema = z
  .object({
    // Profissional ou uma das 7 categorias da Base — ver `CATEGORIAS_ATLETA` em
    // lib/auth/categorias-base.ts (mesma lista de `CATEGORIAS_COMISSAO_TECNICA`).
    categoria: z.enum(
      ["profissional", "sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"],
      { errorMap: () => ({ message: "Categoria é obrigatória" }) },
    ),
    nomeCompleto: z
      .string()
      .min(1, { message: "Nome completo é obrigatório" })
      .transform(normalizarNomeProprio),
    apelido: z.string().optional().or(z.literal("")),
    rg: rgField,
    cpf: cpfField,
    dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
    posicao: posicaoField,
    numeroCamisa: z.coerce.number().int().positive().optional().nullable(),
    numeroCbf: z.coerce.number().int().positive().optional().nullable(),
    peDominante: z.enum(["destro", "canhoto", "ambidestro"]).optional().nullable(),
    telefone: telefoneFieldValidado,
    // Pedido de 2026-10-16 (ver docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md).
    email: emailField,
    // E-mail do pai/mãe — eram só da Base (atleta menor de idade); o formulário só mostra esses
    // campos pra categoria de Base, mas o schema aceita pras duas (ver comentário acima).
    emailPai: emailField,
    emailMae: emailField,
    cidadeNatal: z.string().optional().or(z.literal("")),
    ufNatal: z.string().length(2).optional().or(z.literal("")),
    enderecoAtual: z.string().optional().or(z.literal("")),
    // Endereço estruturado (CEP/logradouro/número/complemento/bairro/cidade/UF) — compartilhado
    // pelas duas categorias desde 2026-09-10.
    ...enderecoFields,
    // Segundo endereço estruturado ("Endereço de origem") — pedido de 2026-10-16.
    ...origemEnderecoFields,
    dataInicioClube: z.string().optional().or(z.literal("")),
    empresarioNome: z.string().optional().or(z.literal("")),
    empresarioTelefone: telefoneField,
    empresarioEmail: emailField,
    // Lista fixa PP/P/M/G/GG/XG — pedido de 2026-10-16.
    tamanhoUniforme: z.enum(TAMANHO_UNIFORME_OPTIONS).optional().or(z.literal("")),
    // Vocabulário único desde a unificação (ver `AtletaStatus` em lib/supabase/types.ts):
    // "suspenso" saiu em 01/10/2026 (Profissional) e na própria unificação (Base, convertido pra
    // "transicao"); "dispensado" passou a valer pras duas categorias — normalmente é o Relatório
    // de Dispensa formal (continua restrito à Base) que grava esse valor, mas o <select> de Status
    // do cadastro interno precisa aceitá-lo também, senão rejeitaria o próprio valor atual de um
    // atleta já dispensado ao salvar qualquer outra alteração no formulário.
    status: z.enum(["liberado", "departamento_medico", "transicao", "dispensado"]).default("liberado"),
    // Pedido de 25/08: "Possui alergia a algum medicamento? Se sim, qual". A checagem de "se sim,
    // qual é obrigatório" vem do `refinoAlergia` aplicado abaixo.
    possuiAlergiaMedicamento: z.boolean().default(false),
    alergiaMedicamentoQual: z.string().optional().or(z.literal("")),
    // Classificação G1/G2/G3 (ver docs/superpowers/specs/
    // 2026-08-25-classificacao-dispensa-atleta-base-design.md) — era só da Base; a unificação
    // estendeu pro Profissional também (opcional pras duas, nem todo atleta precisa estar
    // classificado). "dispensa" ("Dispensa (pendente)") é um 4º valor — sinalizador de saída em
    // avaliação, não muda `status`.
    classificacao: z.enum(["g1", "g2", "g3", "dispensa"]).optional().nullable(),
    // Campos pedidos em 18/08 (ver 0076_captacao_alojamento_base.sql) — alojamento, responsáveis e
    // empresário. Continuam no banco pra qualquer categoria, mas o formulário só os mostra quando
    // a categoria é de Base (decisão do Mateus na unificação, 28/10/2026).
    alojado: z.boolean().default(false),
    valorAjudaCusto: z.coerce.number().nonnegative().optional().nullable(),
    agencia: z.string().optional().or(z.literal("")),
    maeNome: z.string().optional().or(z.literal("")),
    maeTelefone: telefoneFieldValidado,
    paiNome: z.string().optional().or(z.literal("")),
    paiTelefone: telefoneFieldValidado,
    escola: z.string().optional().or(z.literal("")),
  })
  .refine(refinoAlergia.check, refinoAlergia.options);
export type AtletaInput = z.infer<typeof atletaSchema>;

/** Um contato de emergência do atleta (Dados pessoais, lista "+ Adicionar contato") — mesmo schema
 * pro Profissional e pra Base. Ver docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md. */
export const atletaContatoEmergenciaSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  parentesco: z.string().optional().or(z.literal("")),
  contato: z.string().optional().or(z.literal("")),
});
export type AtletaContatoEmergenciaInput = z.infer<typeof atletaContatoEmergenciaSchema>;

/** Aba "Anotações" do perfil do atleta (Profissional, Base e a página do Treinador) — ver
 * docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md. */
export const atletaAnotacaoSchema = z.object({
  texto: z.string().min(1, { message: "Escreva alguma coisa antes de salvar." }),
});
export type AtletaAnotacaoInput = z.infer<typeof atletaAnotacaoSchema>;

/** "Novo contrato" (aba Contrato) — único schema pras duas categorias desde a unificação de
 * 28/10/2026: `AtletaTipoContrato` (lib/supabase/types.ts) já inclui "iniciacao" pra qualquer
 * categoria (antes só a Base aceitava). A lista de OPÇÕES exibida no `<select>` continua separada
 * por categoria (`ATLETA_TIPO_CONTRATO_OPTIONS` sem Iniciação pro Profissional,
 * `ATLETA_BASE_TIPO_CONTRATO_OPTIONS` com ela pra Base — ver `app/atletas/[id]/contrato/novo/
 * page.tsx`), só o `.safeParse` deste schema que ficou único. Ver docs/superpowers/specs/
 * 2026-10-16-atleta-dados-esportivos-contrato-design.md. */
export const atletaContratoSchema = z
  .object({
    tipoContrato: z.enum(["definitivo", "emprestimo", "amador", "formacao", "iniciacao"], {
      errorMap: () => ({ message: "Tipo de contrato é obrigatório" }),
    }),
    clubeOrigem: z.string().optional().or(z.literal("")),
    vigenciaInicio: z.string().optional().or(z.literal("")),
    vigenciaFim: z.string().optional().or(z.literal("")),
    salarioCtps: z.coerce.number().nonnegative().default(0),
    direitoImagem: z.coerce.number().nonnegative().default(0),
    bonificacao: z.coerce.number().nonnegative().default(0),
    auxilioMoradia: z.coerce.number().nonnegative().default(0),
    outros: z.coerce.number().nonnegative().default(0),
  })
  .refine(
    (data) => data.tipoContrato !== "emprestimo" || Boolean(data.clubeOrigem?.trim()),
    { message: "Informe o clube de origem", path: ["clubeOrigem"] },
  );
export type AtletaContratoInput = z.infer<typeof atletaContratoSchema>;

/**
 * Inclusão rápida de atleta pelo Campograma (ver docs/superpowers/specs/
 * 2026-09-02-campograma-edicao-rapida-design.md, seção 4) — só Nome + Posição; categoria vem do
 * estado da própria página (a categoria vista no momento), não é um campo digitado. RG/CPF/data de
 * nascimento ficam de fora de propósito (`null` na criação) — diferente de `atletaBaseSchema`, este
 * schema é enxuto e autocontido, não uma extensão do grande.
 */
export const atletaRapidoCampogramaSchema = z.object({
  nomeCompleto: z
    .string()
    .min(1, { message: "Nome completo é obrigatório" })
    .transform(normalizarNomeProprio),
  posicao: posicaoField,
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
    errorMap: () => ({ message: "Categoria inválida" }),
  }),
});
export type AtletaRapidoCampogramaInput = z.infer<typeof atletaRapidoCampogramaSchema>;

/**
 * Captação/Avaliação (banco dos candidatos em teste, ver `docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md) — banco TOTALMENTE separado de `atletas_base`.
 * Bem menos exigente que o cadastro de Atleta: um candidato pode chegar só com nome e telefone, e o
 * resto entra conforme a avaliação anda. Usado pelo formulário interno (staff) — quem chega pelo
 * link público de inscrição usa `captacaoInscricaoSchema`, mais enxuto.
 */
export const captacaoBaseSchema = z
  .object({
    nomeCompleto: z.string().min(1, { message: "Nome é obrigatório" }).transform(normalizarNomeProprio),
    dataInicio: z.string().optional().or(z.literal("")),
    dataTermino: z.string().optional().or(z.literal("")),
    dataNascimento: z.string().optional().or(z.literal("")),
    posicao: z.string().optional().or(z.literal("")),
    categoria: z
      .enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"])
      .optional()
      .nullable()
      .or(z.literal("")),
    indicacao: z.string().optional().or(z.literal("")),
    desejaAlojamento: z.boolean().default(false),
    clubeAnterior: z.string().optional().or(z.literal("")),
    status: z.enum(["inscricao", "avaliacao", "aprovado", "dispensado", "nao_compareceu"]).default("avaliacao"),
    observacoes: z.string().optional().or(z.literal("")),
    telefone: telefoneField,
    maeNome: z.string().optional().or(z.literal("")),
    maeTelefone: telefoneField,
    paiNome: z.string().optional().or(z.literal("")),
    paiTelefone: telefoneField,
    escola: z.string().optional().or(z.literal("")),
    ...enderecoFields,
    // Campos que passaram a existir também na inscrição pública (ver `captacaoInscricaoSchema` e
    // spec 2026-09-11-captacao-documentos-termo-auto-cadastro-design.md, seção 1) — aqui continuam
    // TODOS opcionais, mesmo raciocínio do resto deste formulário interno (candidato pode chegar só
    // com nome e telefone, o resto entra conforme a avaliação anda). O Termo de Responsabilidade
    // (seção 3) não entra aqui: é um registro de consentimento do próprio candidato/responsável no
    // link público, não um campo que o staff preenche.
    rg: z.string().optional().or(z.literal("")),
    cpf: z.string().optional().or(z.literal("")),
    segundaPosicao: z.string().optional().or(z.literal("")),
    peDominante: z.enum(["destro", "canhoto", "ambidestro"]).optional().nullable().or(z.literal("")),
    // Mesma faixa plausível de `alturaMetrosField` (formulário público) — ver o comentário lá. Aqui
    // continua opcional (cadastro interno pode chegar incompleto), só ganha o teto de segurança pra
    // não estourar `captacao_base.altura numeric(3,2)` se alguém da equipe digitar em centímetros.
    altura: z.coerce
      .number()
      .positive()
      .refine((v) => v <= 2.5, {
        message: "Altura deve ser em metros, até 2.5 (ex.: 1.75) — parece que foi digitada em centímetros.",
      })
      .optional()
      .nullable(),
    peso: z.coerce.number().positive().optional().nullable(),
    email: emailField,
    possuiPlanoSaude: z.boolean().default(false),
    planoSaudeQual: z.string().optional().or(z.literal("")),
    escolaridade: z.string().optional().or(z.literal("")),
    periodoEscolar: z.enum(["manha", "tarde", "noite"]).optional().nullable().or(z.literal("")),
    federado: z.boolean().default(false),
    federadoClube: z.string().optional().or(z.literal("")),
  })
  // Resultado final (Aprovado/Dispensado/Não compareceu) sempre exige a Data de término — é o que
  // faz "falta o termino da avaliação" (pedido de 19/08) valer tanto pra quem usa o botão rápido de
  // finalizar (`mudarStatusCaptacao`) quanto pra quem edita o status direto por este formulário.
  .refine(
    (data) => !["aprovado", "dispensado", "nao_compareceu"].includes(data.status) || Boolean(data.dataTermino),
    { message: "Informe a data de término da avaliação", path: ["dataTermino"] },
  );
export type CaptacaoBaseInput = z.infer<typeof captacaoBaseSchema>;

/** Campo de texto obrigatório da inscrição pública de Captação — mensagem própria por campo pra o
 * erro fazer sentido embaixo de cada um (ver `captacaoInscricaoSchema`). */
function inscricaoRequiredField(mensagem: string) {
  return z.string().min(1, { message: mensagem });
}

/**
 * Inscrição pública pro teste/avaliação (`/inscricao-captacao-base`) — cria sempre com
 * `status: "inscricao"` e `origem: "publico"`, decidido no servidor. Mesmos campos do formulário
 * interno (`captacaoBaseSchema`), EXCETO Data de início/Data de término (o Mateus preenche na hora
 * de aprovar/trocar o status), Status/Observações (internos) e Alojamento (ajuste de 19/08: fica só
 * no cadastro interno — "remover a parte de alojamento e deixar isso como opção para mim colocar",
 * o Mateus decide isso depois de conhecer o candidato, não é algo que a família preenche).
 *
 * TODOS os campos são obrigatórios (pedido de 19/08: "tornar obrigatório todas as informações") —
 * diferente de `captacaoBaseSchema` (cadastro interno, onde o candidato pode chegar só com nome e
 * telefone) e diferente também de `telefoneField`/`enderecoFields` (compartilhados com outros
 * cadastros do sistema, onde continuam opcionais) — por isso este schema não reaproveita esses
 * campos genéricos, define os seus próprios exigindo preenchimento.
 */
/** Campo numérico obrigatório vindo de texto livre (altura em metros, peso em kg) — mesmo raciocínio
 * do `valorSalario` de `cadastroPublicoComissaoTecnicaSchema`: valida a string primeiro (vazio =
 * erro "obrigatório") em vez de `z.coerce.number()` direto, que aceitaria "" como 0. */
function medidaRequiredField(mensagem: string, mensagemInvalida: string) {
  return z
    .string()
    .min(1, { message: mensagem })
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, { message: mensagemInvalida })
    .transform((v) => Number(v));
}

/** Altura em metros, com faixa plausível (1 a 2,5m — cobre qualquer categoria de base ou o
 * Profissional, com folga) — sem esse limite, alguém digitando a altura em centímetros (ex.: "168"
 * em vez de "1.68") passava pela validação (168 > 0) e só quebrava na hora de gravar, com um erro
 * cru de banco ("numeric field overflow", já que `captacao_base.altura` é `numeric(3,2)`, cabe até
 * 9,99) aparecendo pra família no meio da inscrição, sem entender o que fazer (relatado pelo Mateus
 * em 27/09, com vídeo mostrando "168" digitado). Mesmo raciocínio de `medidaRequiredField`, mas com
 * mensagem e faixa específicas — não reaproveita `medidaRequiredField` porque `peso` (kg) não tem
 * essa restrição (a coluna é `numeric(5,2)`, cabe até 999,99, sem risco de estouro). */
function alturaMetrosField(mensagem: string) {
  return z
    .string()
    .min(1, { message: mensagem })
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: "Informe uma altura válida, em metros (ex.: 1.75)",
    })
    .refine((v) => Number(v) >= 1 && Number(v) <= 2.5, {
      message: "Altura deve ser em metros, entre 1 e 2.5 (ex.: 1.75) — parece que foi digitada em centímetros.",
    })
    .transform((v) => Number(v));
}

/** Checkbox "Li e concordo" do Termo de Responsabilidade (ver spec 2026-09-11, seção 3) — precisa
 * estar marcado, não é só um boolean qualquer (por isso o `.refine` em vez de aceitar `false`). Um
 * pro Atleta e um pro Responsável Legal, separados de propósito. */
function concordoTermoField(mensagem: string) {
  return z.boolean().refine((v) => v === true, { message: mensagem });
}

/**
 * Inscrição pública pro teste/avaliação (`/inscricao-captacao-base`) — cria sempre com
 * `status: "inscricao"` e `origem: "publico"`, decidido no servidor. Mesmos campos do formulário
 * interno (`captacaoBaseSchema`), EXCETO Data de início/Data de término (o Mateus preenche na hora
 * de aprovar/trocar o status), Status/Observações (internos) e Alojamento (ajuste de 19/08: fica só
 * no cadastro interno — "remover a parte de alojamento e deixar isso como opção para mim colocar",
 * o Mateus decide isso depois de conhecer o candidato, não é algo que a família preenche).
 *
 * TODOS os campos são obrigatórios (pedido de 19/08: "tornar obrigatório todas as informações") —
 * diferente de `captacaoBaseSchema` (cadastro interno, onde o candidato pode chegar só com nome e
 * telefone) e diferente também de `telefoneField`/`enderecoFields` (compartilhados com outros
 * cadastros do sistema, onde continuam opcionais) — por isso este schema não reaproveita esses
 * campos genéricos, define os seus próprios exigindo preenchimento.
 *
 * Ganhou, em 2026-09-11 (ver spec 2026-09-11-captacao-documentos-termo-auto-cadastro-design.md), os
 * campos que faltavam comparado à "Ficha de Avaliação" física (RG/CPF, 2ª posição, pé dominante,
 * altura/peso, e-mail, plano de saúde, escolaridade/período e federação — todos obrigatórios aqui,
 * exceto 2ª posição, que nem todo atleta tem) e o bloco do Termo de Responsabilidade — consentimento
 * digital, não uma assinatura desenhada: nome/CPF do responsável legal mais um "Li e concordo"
 * separado do Atleta e do Responsável. Os 5 documentos obrigatórios e a foto são arquivos, validados
 * à parte na Server Action (não cobertos por este schema — ver `app/inscricao-captacao-base/actions.ts`).
 */
export const captacaoInscricaoSchema = z
  .object({
    nomeCompleto: z.string().min(1, { message: "Nome do atleta é obrigatório" }).transform(normalizarNomeProprio),
    rg: rgField,
    cpf: cpfField,
    dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
    posicao: inscricaoRequiredField("Posição é obrigatória"),
    segundaPosicao: z.string().optional().or(z.literal("")),
    peDominante: z.enum(["destro", "canhoto", "ambidestro"], {
      errorMap: () => ({ message: "Pé dominante é obrigatório" }),
    }),
    altura: alturaMetrosField("Altura é obrigatória"),
    peso: medidaRequiredField("Peso é obrigatório", "Informe um peso válido (em kg, ex. 68.5)"),
    categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
      errorMap: () => ({ message: "Categoria é obrigatória" }),
    }),
    telefone: inscricaoRequiredField("Telefone é obrigatório"),
    email: z.string().min(1, { message: "E-mail é obrigatório" }).email({ message: "E-mail inválido" }),
    indicacao: inscricaoRequiredField("Indicação é obrigatória"),
    clubeAnterior: inscricaoRequiredField("Clube anterior é obrigatório"),
    maeNome: inscricaoRequiredField("Nome da mãe é obrigatório"),
    maeTelefone: inscricaoRequiredField("Telefone da mãe é obrigatório"),
    paiNome: inscricaoRequiredField("Nome do pai é obrigatório"),
    paiTelefone: inscricaoRequiredField("Telefone do pai é obrigatório"),
    escola: inscricaoRequiredField("Escola é obrigatória"),
    escolaridade: inscricaoRequiredField("Escolaridade é obrigatória"),
    periodoEscolar: z.enum(["manha", "tarde", "noite"], {
      errorMap: () => ({ message: "Período escolar é obrigatório" }),
    }),
    possuiPlanoSaude: z.enum(["sim", "nao"], {
      errorMap: () => ({ message: "Informe se o atleta possui plano de saúde" }),
    }),
    planoSaudeQual: z.string().optional().or(z.literal("")),
    federado: z.enum(["sim", "nao"], {
      errorMap: () => ({ message: "Informe se o atleta é federado" }),
    }),
    federadoClube: z.string().optional().or(z.literal("")),
    cep: inscricaoRequiredField("CEP é obrigatório"),
    logradouro: inscricaoRequiredField("Endereço é obrigatório"),
    numero: inscricaoRequiredField("Número é obrigatório"),
    complemento: inscricaoRequiredField("Complemento é obrigatório"),
    bairro: inscricaoRequiredField("Bairro é obrigatório"),
    cidade: inscricaoRequiredField("Cidade é obrigatória"),
    uf: inscricaoRequiredField("UF é obrigatória"),
    // Termo de Responsabilidade — consentimento digital (seção 3 do spec).
    responsavelLegalNome: inscricaoRequiredField("Nome do responsável legal é obrigatório"),
    responsavelLegalCpf: cpfField,
    concordoAtleta: concordoTermoField("É necessário confirmar que o Atleta leu e concorda com o Termo"),
    concordoResponsavel: concordoTermoField("É necessário confirmar que o Responsável leu e concorda com o Termo"),
  })
  .refine((data) => data.possuiPlanoSaude !== "sim" || Boolean(data.planoSaudeQual?.trim()), {
    message: "Informe qual é o plano de saúde",
    path: ["planoSaudeQual"],
  })
  .refine((data) => data.federado !== "sim" || Boolean(data.federadoClube?.trim()), {
    message: "Informe o clube em que o atleta é federado",
    path: ["federadoClube"],
  });
export type CaptacaoInscricaoInput = z.infer<typeof captacaoInscricaoSchema>;

/** Nota do Parecer Final — sempre inteira, entre 3 e 9 (mesma escala da legenda impressa no
 * documento: 3-4 Regular, 5-6 Bom, 7-8 Muito Bom, 9 Excelente). */
const notaParecerField = z.coerce
  .number({ invalid_type_error: "Escolha uma nota" })
  .int()
  .min(3, { message: "Nota deve ser de 3 a 9" })
  .max(9, { message: "Nota deve ser de 3 a 9" });

/**
 * Parecer Final de Avaliação (`/treinador/[id]`) — preenchido pelo Treinador, nunca pelo Mateus
 * (ver docs/superpowers/specs/2026-08-19-parecer-final-treinador-design.md). O veredito usa a
 * mesma nomenclatura do status da Captação ("aprovado"/"dispensado", não "reprovado") porque ao
 * salvar o parecer o status do candidato muda pra esse valor direto — não existe um conceito de
 * veredito separado do status administrativo.
 */
export const parecerCaptacaoSchema = z.object({
  notaTecnica: notaParecerField,
  notaFisica: notaParecerField,
  notaTatica: notaParecerField,
  notaComportamental: notaParecerField,
  comentarios: z.string().optional().or(z.literal("")),
  veredito: z.enum(["aprovado", "dispensado"], {
    errorMap: () => ({ message: "Selecione o resultado da avaliação" }),
  }),
});
export type ParecerCaptacaoInput = z.infer<typeof parecerCaptacaoSchema>;

/**
 * Relatório de Dispensa de um atleta da Base que já é do clube (ver docs/superpowers/specs/
 * 2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) — diferente do Parecer Final
 * (que é só pra candidatos da Captação decidindo se entram ou não). Preenchido tanto pelo Treinador
 * (`/treinador/atletas/[id]/dispensa`) quanto pelo Mateus (`/base/atletas/[categoria]/[id]/
 * dispensa`) — mesmas 4 notas e escala 3-9 do Parecer Final, mais o motivo e a data da dispensa
 * (fim do período no clube).
 */
export const relatorioDispensaSchema = z.object({
  dispensaData: z.string().min(1, { message: "Data da dispensa é obrigatória" }),
  motivo: z.string().min(1, { message: "Motivo da dispensa é obrigatório" }),
  notaTecnica: notaParecerField,
  notaFisica: notaParecerField,
  notaTatica: notaParecerField,
  notaComportamental: notaParecerField,
});
export type RelatorioDispensaInput = z.infer<typeof relatorioDispensaSchema>;

/** Campo de texto obrigatório da Ficha de Cadastro pública de Atleta — mesmo padrão de
 * `inscricaoRequiredField`/`comissaoPublicoRequiredField`: TODOS os dados são obrigatórios aqui
 * (pedido de 25/08: "o link publico deve ser obrigatórios todos os dados"), mesmo raciocínio já
 * aplicado ao link público de Comissão Técnica. O campo de Empresário usa este helper (texto não
 * vazio) em vez de validação estrita de telefone, pra quem não tem empresário poder preencher
 * "Não possui" em vez de travar o envio — ver instrução na própria tela. Telefone do atleta/mãe/pai
 * usam `telefonePublicoRequiredField` (formato válido de verdade — ver comentário abaixo). */
function atletaPublicoRequiredField(mensagem: string) {
  return z.string().min(1, { message: mensagem });
}

/** Telefone obrigatório com formato válido (11 dígitos) — diferente de
 * `atletaPublicoRequiredField`, que aceita qualquer texto não vazio (incluindo "Não possui").
 * Usado pro telefone do próprio atleta e, desde 25/08, também mãe/pai (pedido: "telefone pai e
 * mãe, deixar essa máscara" — perdem a opção de "Não possui" que tinham antes). O telefone do
 * empresário continua usando `atletaPublicoRequiredField`. */
function telefonePublicoRequiredField(mensagem: string) {
  return z
    .string()
    .min(1, { message: mensagem })
    .refine(isValidTelefone, { message: "Telefone inválido" });
}

/**
 * Ficha de Cadastro pública de Atleta (`/cadastro-atleta-base`) — pros atletas que já são (ou estão
 * entrando) do clube, a família preenche o cadastro completo. Grava DIRETO em `atletas_base`, sem
 * relação nenhuma com a Captação (ver a spec de 19/08). Campos administrativos do clube (status,
 * tipo de contrato, número de camisa/CBF/FPF, "Data de início do contrato") ficam de fora — isso o
 * Mateus preenche depois pela tela interna. Exceção: "Data de início no clube" (`dataInicioClube`)
 * — distinto de "Data de início do contrato" — passou a ser obrigatório aqui também (pedido de
 * 25/08, terceira rodada), mesmo continuando opcional no cadastro interno.
 *
 * Desde 25/08 (ver docs/superpowers/specs/2026-08-25-atleta-contrato-posicao-cpf-design.md) TODOS
 * os campos são obrigatórios aqui, inclusive RG/CPF — que antes ficavam opcionais porque "a família
 * pode não ter em mãos ainda". Pedido explícito do Mateus overrida essa exceção pra este link. A
 * foto (obrigatória, mesmo padrão dos outros links públicos) é validada na action, não aqui — ver
 * `app/cadastro-atleta-base/actions.ts`, mesmo esquema de `cadastrarComissaoTecnicaPublico`.
 */
export const fichaCadastroAtletaBaseSchema = z
  .object({
    categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
      errorMap: () => ({ message: "Categoria é obrigatória" }),
    }),
    nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }).transform(normalizarNomeProprio),
    apelido: atletaPublicoRequiredField("Apelido é obrigatório"),
    rg: rgField,
    cpf: cpfField,
    dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
    posicao: posicaoField,
    // Pedido de 25/08 (segunda rodada): "pé dominante precisa conter no cadastro público" — o
    // cadastro interno já tem esse campo (opcional, com "Não informado"); no link público é
    // obrigatório escolher Destro/Canhoto/Ambidestro, sem essa opção neutra.
    peDominante: z.enum(["destro", "canhoto", "ambidestro"], {
      errorMap: () => ({ message: "Pé dominante é obrigatório" }),
    }),
    telefone: telefonePublicoRequiredField("Telefone é obrigatório"),
    cidadeNatal: atletaPublicoRequiredField("Cidade natal é obrigatória"),
    ufNatal: atletaPublicoRequiredField("UF natal é obrigatória"),
    alojado: z.boolean().default(false),
    escola: atletaPublicoRequiredField("Escola é obrigatória"),
    // Pedido de 25/08 (terceira rodada): "Data de início no clube... isso precisa conter no
    // cadastro como obrigatório" — só no link público (o Mateus confirmou que não precisa mexer
    // no cadastro interno, onde o campo já existe e continua opcional).
    dataInicioClube: z.string().min(1, { message: "Data de início no clube é obrigatória" }),
    // Pedido de 25/08: obrigatório responder, e obrigatório dizer qual quando "sim" — ver
    // `.refine` no final do schema. Convertido pra boolean na action antes de gravar.
    possuiAlergiaMedicamento: z.enum(["sim", "nao"], {
      errorMap: () => ({ message: "Informe se o atleta possui alergia a algum medicamento" }),
    }),
    alergiaMedicamentoQual: z.string().optional().or(z.literal("")),
    agencia: atletaPublicoRequiredField("Agência é obrigatória"),
    empresarioNome: atletaPublicoRequiredField("Nome do empresário é obrigatório"),
    empresarioTelefone: atletaPublicoRequiredField("Telefone do empresário é obrigatório"),
    maeNome: atletaPublicoRequiredField("Nome da mãe é obrigatório"),
    maeTelefone: telefonePublicoRequiredField("Telefone da mãe é obrigatório"),
    paiNome: atletaPublicoRequiredField("Nome do pai é obrigatório"),
    paiTelefone: telefonePublicoRequiredField("Telefone do pai é obrigatório"),
    cep: atletaPublicoRequiredField("CEP é obrigatório"),
    logradouro: atletaPublicoRequiredField("Endereço é obrigatório"),
    numero: atletaPublicoRequiredField("Número é obrigatório"),
    complemento: atletaPublicoRequiredField("Complemento é obrigatório"),
    bairro: atletaPublicoRequiredField("Bairro é obrigatório"),
    cidade: atletaPublicoRequiredField("Cidade é obrigatória"),
    uf: atletaPublicoRequiredField("UF é obrigatória"),
  })
  .refine((data) => data.possuiAlergiaMedicamento !== "sim" || Boolean(data.alergiaMedicamentoQual?.trim()), {
    message: "Informe qual é a alergia",
    path: ["alergiaMedicamentoQual"],
  });
export type FichaCadastroAtletaBaseInput = z.infer<typeof fichaCadastroAtletaBaseSchema>;

/** Capacidade total do Alojamento (`/base/alojamento`) — "vagas disponíveis" é essa menos quem já
 * está com `atletas_base.alojado = true` (ver lib/futebol/alojamento.ts). */
export const alojamentoConfigSchema = z.object({
  capacidadeTotal: z.coerce.number().int().nonnegative({ message: "Informe um número válido de vagas" }),
  observacoes: z.string().optional().or(z.literal("")),
});
export type AlojamentoConfigInput = z.infer<typeof alojamentoConfigSchema>;

/** Tipo de contrato da Comissão Técnica/Diretoria (Profissional e Base) — ver
 * docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md. Opcional no
 * cadastro manual do admin, obrigatório no link público. */
export const COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "sem_contrato", label: "Sem contrato" },
] as const;

export const comissaoTecnicaSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
  apelido: z.string().optional().or(z.literal("")),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  funcao: z.string().min(1, { message: "Função/cargo é obrigatório" }),
  telefone: telefoneFieldValidado,
  email: z.string().email({ message: "E-mail inválido" }).optional().or(z.literal("")),
  tipoContrato: z.enum(["clt", "pj", "sem_contrato"]).optional().nullable().or(z.literal("")),
  valorSalario: z.coerce.number().nonnegative().optional().nullable(),
  dataInicio: z.string().optional().or(z.literal("")),
});
export type ComissaoTecnicaInput = z.infer<typeof comissaoTecnicaSchema>;

/** Mesmo formulário de `comissaoTecnicaSchema`, mais a categoria de idade do Futebol de Base
 * (obrigatória — ver `lib/auth/categorias-base.ts`). */
export const comissaoTecnicaBaseSchema = comissaoTecnicaSchema.extend({
  // Uma pessoa pode atuar em mais de uma categoria (ex.: mesmo treinador no Sub-11 e no Sub-12) —
  // ver docs/superpowers/specs/2026-08-19-comissao-tecnica-multi-categoria-design.md.
  categorias: z
    .array(z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"]))
    .min(1, { message: "Selecione ao menos uma categoria" }),
});
export type ComissaoTecnicaBaseInput = z.infer<typeof comissaoTecnicaBaseSchema>;

/** Mesmo formulário de `comissaoTecnicaSchema`, mas com `categorias` cobrindo também
 * "profissional" — desde a unificação da Comissão Técnica (ver docs/superpowers/specs/2026-10-28-
 * unificacao-comissao-tecnica-design.md), a tabela e o formulário são um só pros dois
 * departamentos, com "Profissional" tratado como mais uma categoria ao lado das 7 da Base (mesmo
 * padrão já usado em `copiarDiaProgramacaoSchema`, mais abaixo). Substitui `comissaoTecnicaSchema`/
 * `comissaoTecnicaBaseSchema` no cadastro interno — os dois ficam só pelo histórico/referência. */
export const comissaoTecnicaUnificadaSchema = comissaoTecnicaSchema.extend({
  categorias: z
    .array(z.enum(["profissional", "sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"]))
    .min(1, { message: "Selecione ao menos uma categoria" }),
});
export type ComissaoTecnicaUnificadaInput = z.infer<typeof comissaoTecnicaUnificadaSchema>;

/** Campo obrigatório do formulário público de Comissão Técnica — TODOS os campos são obrigatórios
 * aqui (pedido do Mateus: "para o preenchimento da comissão, todos os dados devem ser
 * obrigatórios"), diferente do cadastro interno (`comissaoTecnicaSchema`), onde a maioria continua
 * opcional. Mesmo padrão de `inscricaoRequiredField`, usado na inscrição pública de Captação. */
function comissaoPublicoRequiredField(mensagem: string) {
  return z.string().min(1, { message: mensagem });
}

/** Formulário público único de auto-cadastro da Comissão Técnica (`/cadastro-comissao-tecnica`,
 * Profissional + Base juntos num só link — ver docs/superpowers/specs/2026-10-28-unificacao-
 * comissao-tecnica-design.md). Link único, sempre cria um cadastro novo. Antes desta unificação
 * existia um segundo schema (`cadastroPublicoComissaoTecnicaBaseSchema`, removido) que só
 * acrescentava `categorias` pro link separado da Base — agora é um único schema, com `categorias`
 * sempre obrigatória ("profissional" é só mais uma opção, junto das 7 categorias de Base). */
export const cadastroPublicoComissaoTecnicaSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }).transform(normalizarNomeProprio),
  apelido: comissaoPublicoRequiredField("Apelido é obrigatório"),
  rg: comissaoPublicoRequiredField("RG é obrigatório"),
  cpf: cpfField,
  dataNascimento: comissaoPublicoRequiredField("Data de nascimento é obrigatória"),
  categorias: z
    .array(z.enum(["profissional", "sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"]))
    .min(1, { message: "Selecione ao menos uma categoria" }),
  funcao: comissaoPublicoRequiredField("Função/cargo é obrigatória"),
  telefone: z
    .string()
    .min(1, { message: "Telefone é obrigatório" })
    .refine(isValidTelefone, { message: "Telefone inválido" }),
  email: z.string().min(1, { message: "E-mail é obrigatório" }).email({ message: "E-mail inválido" }),
  tipoContrato: z.enum(["clt", "pj", "sem_contrato"], {
    errorMap: () => ({ message: "Tipo de contrato é obrigatório" }),
  }),
  // Não usamos `z.coerce.number()` direto: o campo vem de um `CurrencyField` (ver
  // `components/currency-field.tsx`), cujo `<input type="hidden">` manda "" quando nada foi
  // digitado — e `Number("")` é 0, não NaN, então `z.coerce.number()` aceitaria silenciosamente um
  // salário em branco como R$ 0,00 em vez de barrar o envio. Validamos a string primeiro (vazio =
  // erro "obrigatório") e só then convertemos pra número.
  valorSalario: z
    .string()
    .min(1, { message: "Salário é obrigatório" })
    .refine((v) => !Number.isNaN(Number(v)), { message: "Informe um salário válido" })
    .transform((v) => Number(v))
    .refine((v) => v >= 0, { message: "Informe um salário válido" }),
  dataInicio: comissaoPublicoRequiredField("Data de início é obrigatória"),
});
export type CadastroPublicoComissaoTecnicaInput = z.infer<typeof cadastroPublicoComissaoTecnicaSchema>;

/** Fluxo de "completar cadastro" no mesmo link público da Comissão Técnica (Profissional e Base) —
 * ver docs/superpowers/specs/2026-08-26-comissao-tecnica-completar-cadastro-design.md. Passo 1: só
 * o CPF, pra saber se é alguém se cadastrando pela primeira vez ou alguém que já está cadastrado. */
export const completarCadastroComissaoCpfSchema = z.object({ cpf: cpfField });

/** Passo 2 do mesmo fluxo: confirma identidade de quem já está cadastrado com CPF + data de
 * nascimento (nenhum dos dois sozinho libera a edição). */
export const completarCadastroComissaoIdentidadeSchema = z.object({
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
});

/** Passo 3 do mesmo fluxo: os sete campos que podem estar faltando num cadastro antigo — não é só
 * tipo de contrato/data de início/salário (os 3 campos novos da migration 0084): apelido, telefone,
 * e-mail e foto também são opcionais no cadastro interno de sempre (`comissaoTecnicaSchema`), então
 * qualquer cadastro feito por lá antes do link público existir pode ter ficado sem um desses, e o
 * link público exige todos (ver `cadastroPublicoComissaoTecnicaSchema`). A foto não entra neste
 * schema — é um arquivo, validado à parte na Server Action, mesmo padrão do cadastro novo. Todos os
 * campos de texto aqui são opcionais de propósito — quem decide se um campo é obrigatório é a
 * Server Action, reconferindo no banco quais campos aquele cadastro específico realmente tem vazios
 * (nunca confia em quais campos o formulário decidiu mostrar). */
export const completarCadastroComissaoDadosSchema = z.object({
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  apelido: z.string().optional().or(z.literal("")),
  telefone: telefoneFieldValidado,
  email: emailField,
  tipoContrato: z.enum(["clt", "pj", "sem_contrato"]).optional().or(z.literal("")),
  dataInicio: z.string().optional().or(z.literal("")),
  // Mesmo raciocínio de `cadastroPublicoComissaoTecnicaSchema.valorSalario`: o campo vem de um
  // `CurrencyField`, cujo hidden input manda "" quando vazio — valida a string primeiro pra não
  // deixar `Number("")` (que é 0) passar como se fosse um valor preenchido.
  valorSalario: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), { message: "Informe um salário válido" })
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || v >= 0, { message: "Informe um salário válido" }),
});
export type CompletarCadastroComissaoDadosInput = z.infer<typeof completarCadastroComissaoDadosSchema>;

const NOVA_FUNCAO_VALUE = "__nova__";

export const staffOperacionalSchema = z
  .object({
    nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
    rg: rgField,
    cpf: cpfField,
    dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
    // Obrigatório só quando NÃO for terceirizada — nesse caso a única função pedida é a da
    // terceirizada (funcaoTerceirizadaId, abaixo), pra pessoa preencher só 1 campo de função.
    funcaoId: z.string().optional().or(z.literal("")),
    novaFuncaoNome: z.string().optional().or(z.literal("")),
    telefone: telefoneField,
    email: emailField,
    ...enderecoFields,
    // Terceirizada: em vez de Chave PIX (o pagamento não é direto à pessoa), pede uma segunda
    // função — a da terceirizada em si — vinda do mesmo catálogo staff_funcoes_catalogo. Ver
    // resolveFuncaoId/resolveFuncaoTerceirizadaId em app/staff-operacional/actions.ts.
    terceirizada: z.boolean().default(false),
    funcaoTerceirizadaId: z.string().optional().or(z.literal("")),
    novaFuncaoTerceirizadaNome: z.string().optional().or(z.literal("")),
    chavePix: z.string().optional().or(z.literal("")),
    chavePixTipo: chavePixTipoField,
    valorPadraoPagamento: z.coerce.number().nonnegative().optional().nullable(),
  })
  .refine((data) => data.terceirizada || Boolean(data.funcaoId), {
    message: "Função/setor é obrigatório",
    path: ["funcaoId"],
  })
  .refine((data) => data.funcaoId !== NOVA_FUNCAO_VALUE || Boolean(data.novaFuncaoNome?.trim()), {
    message: "Informe o nome da nova função",
    path: ["novaFuncaoNome"],
  })
  .refine((data) => !data.terceirizada || Boolean(data.funcaoTerceirizadaId), {
    message: "Informe a função da terceirizada",
    path: ["funcaoTerceirizadaId"],
  })
  .refine(
    (data) => data.funcaoTerceirizadaId !== NOVA_FUNCAO_VALUE || Boolean(data.novaFuncaoTerceirizadaNome?.trim()),
    { message: "Informe o nome da nova função", path: ["novaFuncaoTerceirizadaNome"] },
  )
  .refine((data) => chavePixValida(data.chavePix, data.chavePixTipo), {
    message: "Chave PIX incompleta para o tipo selecionado",
    path: ["chavePix"],
  });
export type StaffOperacionalInput = z.infer<typeof staffOperacionalSchema>;
export { NOVA_FUNCAO_VALUE };

/** Nome de uma função do catálogo `staff_funcoes_catalogo` — usado tanto pra cadastrar quanto pra
 * renomear uma função em `app/staff-operacional/funcoes/` (tela de gerenciamento do catálogo,
 * compartilhada entre Profissional e Base). */
export const funcaoCatalogoSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
});
export type FuncaoCatalogoInput = z.infer<typeof funcaoCatalogoSchema>;

/**
 * Cadastro público de Staff Operacional (link enviado pra pessoa preencher sozinha, sem login):
 * mesmo formulário, mas sem valor de pagamento (decisão interna) e sem opção de criar função nova
 * (só escolhe entre as já cadastradas) — ver docs/superpowers/specs para o design completo.
 *
 * Terceirizada: mesmo conceito do cadastro interno (ver staffOperacionalSchema) — quando marcada,
 * pede só a função da terceirizada em vez de Função/setor + Chave PIX. Diferente do interno, a
 * função da terceirizada aqui também só escolhe entre as já cadastradas (sem "+ nova função").
 */
export const cadastroPublicoStaffSchema = z
  .object({
    nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
    rg: rgField,
    cpf: cpfField,
    dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
    funcaoId: z.string().optional().or(z.literal("")),
    telefone: telefoneField,
    email: emailField,
    ...enderecoFields,
    terceirizada: z.boolean().default(false),
    funcaoTerceirizadaId: z.string().optional().or(z.literal("")),
    chavePix: z.string().optional().or(z.literal("")),
    chavePixTipo: chavePixTipoField,
  })
  .refine((data) => data.terceirizada || Boolean(data.funcaoId), {
    message: "Função/setor é obrigatório",
    path: ["funcaoId"],
  })
  .refine((data) => !data.terceirizada || Boolean(data.funcaoTerceirizadaId), {
    message: "Informe a função da terceirizada",
    path: ["funcaoTerceirizadaId"],
  })
  .refine((data) => chavePixValida(data.chavePix, data.chavePixTipo), {
    message: "Chave PIX incompleta para o tipo selecionado",
    path: ["chavePix"],
  });
export type CadastroPublicoStaffInput = z.infer<typeof cadastroPublicoStaffSchema>;

export const jogoSchema = z.object({
  competicao: z.string().min(1, { message: "Competição é obrigatória" }),
  rodadaFase: z.string().optional().or(z.literal("")),
  adversarioNome: z.string().min(1, { message: "Nome do adversário é obrigatório" }),
  dataJogo: z.string().min(1, { message: "Data do jogo é obrigatória" }),
  horario: z.string().optional().or(z.literal("")),
  localEstadio: z.string().optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  mandante: z.boolean(),
  golsPro: z.coerce.number().int().nonnegative().optional().nullable(),
  golsContra: z.coerce.number().int().nonnegative().optional().nullable(),
});
export type JogoInput = z.infer<typeof jogoSchema>;

/** Mesmo formulário de `jogoSchema`, mais a categoria de idade do Futebol de Base (obrigatória —
 * ver `lib/auth/categorias-base.ts`). Mesmo padrão de `atletaBaseSchema`/`comissaoTecnicaBaseSchema`.
 * Diferente do Profissional, `competicao` deixa de ser obrigatória aqui: na Base ela vem de um
 * select vinculado ao cadastro de Competições (ver `competicaoId`), e pode ser o primeiro jogo da
 * categoria antes de existir cadastro — nesse caso o campo fica em branco (ver
 * docs/superpowers/specs/2026-10-03-competicoes-base-design.md). `competicaoId` é o valor real do
 * select — o texto `competicao` gravado em `jogos_base` é derivado dele no servidor
 * (`app/base/jogos/actions.ts`), nunca digitado pelo usuário. */
export const jogoBaseSchema = jogoSchema.extend({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  competicao: z.string().optional().or(z.literal("")),
  competicaoId: z.string().optional().or(z.literal("")),
});
export type JogoBaseInput = z.infer<typeof jogoBaseSchema>;

/** Sugestões de função/cargo para a Comissão Técnica/Diretoria (campo aceita texto livre além destas). */
export const SUGESTOES_FUNCAO_COMISSAO = [
  "Técnico",
  "Auxiliar Técnico",
  "Preparador Físico",
  "Preparador de Goleiros",
  "Fisioterapeuta",
  "Médico",
  "Analista de Desempenho",
  "Mordomo",
  "Presidente",
  "Diretor",
  "Diretor Adjunto",
  "Assessor Jurídico",
  "Coordenador",
  "Gerente Geral",
  "Supervisor",
] as const;

/**
 * Funções de Staff Operacional agora vêm da tabela staff_funcoes_catalogo (editável pelo próprio
 * usuário no sistema) em vez de uma lista fixa aqui. Ver supabase/migrations/0003_convocacao.sql.
 */

export const TAREFA_CATEGORIAS = [
  { value: "logistica", label: "Logística" },
  { value: "registro", label: "Registro" },
  { value: "financeiro", label: "Financeiro" },
  { value: "solicitacoes", label: "Solicitações" },
  { value: "gerais", label: "Gerais" },
] as const;

export const TAREFA_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "solicitado", label: "Solicitado" },
  { value: "concluido", label: "Concluído" },
] as const;

export const tarefaSchema = z.object({
  titulo: z.string().min(1, { message: "Título é obrigatório" }),
  descricao: z.string().optional().or(z.literal("")),
  categoria: z.enum(["logistica", "registro", "financeiro", "solicitacoes", "gerais"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  status: z.enum(["pendente", "em_andamento", "solicitado", "concluido"]).default("pendente"),
  prazo: z.string().optional().or(z.literal("")),
});
export type TarefaInput = z.infer<typeof tarefaSchema>;

export const tarefaStatusSchema = z.object({
  status: z.enum(["pendente", "em_andamento", "solicitado", "concluido"]),
});

/**
 * Demandas por pessoa (Painel de Demandas, ver docs/superpowers/specs/2026-10-05-assistencia-
 * social-e-demandas-design.md, Parte 2) — mesmo espírito de `tarefaSchema`/`TAREFA_STATUS`, mas sem
 * `categoria` (não existe aqui) e com 3 status em vez de 4: "solicitado" só fazia sentido no fluxo
 * de aprovação de Tarefas, que não existe em Demandas.
 */
export const DEMANDA_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
] as const;

export const demandaSchema = z.object({
  titulo: z.string().min(1, { message: "Título é obrigatório" }),
  descricao: z.string().optional().or(z.literal("")),
  prazo: z.string().optional().or(z.literal("")),
});
export type DemandaInput = z.infer<typeof demandaSchema>;

export const demandaStatusSchema = z.object({
  status: z.enum(["pendente", "em_andamento", "concluido"]),
});

const NOVA_CATEGORIA_GASTO_VALUE = "__nova__";

/**
 * Fase do gasto (Pré-jogo/Pós-jogo) — ver docs/superpowers/specs/2026-10-14-gastos-jogo-fase-
 * design.md. Não confundir com os nomes dos dois PDFs de resumo financeiro do jogo ("Orçamento
 * Previsto (Pré Jogo)"/"Relatório de Despesas (Pós Jogo)") — aqueles descrevem QUANDO cada
 * documento costuma ser gerado, isso aqui classifica CADA gasto individualmente.
 */
export const FASE_GASTO_OPTIONS = [
  { value: "pre_jogo", label: "Pré-jogo" },
  { value: "pos_jogo", label: "Pós-jogo" },
] as const;

export const gastoJogoSchema = z
  .object({
    categoriaId: z.string().min(1, { message: "Categoria é obrigatória" }),
    novaCategoriaNome: z.string().optional().or(z.literal("")),
    descricao: z.string().optional().or(z.literal("")),
    valorPrevisto: z.coerce.number().nonnegative({ message: "Valor previsto não pode ser negativo" }),
    valorEfetuado: z.coerce.number().nonnegative().optional().nullable(),
    data: z.string().optional().or(z.literal("")),
    fase: z.enum(["pre_jogo", "pos_jogo"], { errorMap: () => ({ message: "Fase é obrigatória" }) }),
  })
  .refine((data) => data.categoriaId !== NOVA_CATEGORIA_GASTO_VALUE || Boolean(data.novaCategoriaNome?.trim()), {
    message: "Informe o nome da nova categoria",
    path: ["novaCategoriaNome"],
  });
export type GastoJogoInput = z.infer<typeof gastoJogoSchema>;
export { NOVA_CATEGORIA_GASTO_VALUE };

/** Mesmo formato de gastoJogoSchema, para despesas avulsas (sem jogo_id — o vínculo com jogos, se
 * houver, vem separado via os checkboxes "jogo_<id>" do formulário, lidos direto do FormData). */
export const despesaAvulsaSchema = z
  .object({
    categoriaId: z.string().min(1, { message: "Categoria é obrigatória" }),
    novaCategoriaNome: z.string().optional().or(z.literal("")),
    descricao: z.string().optional().or(z.literal("")),
    valorPrevisto: z.coerce.number().nonnegative({ message: "Valor previsto não pode ser negativo" }),
    valorEfetuado: z.coerce.number().nonnegative().optional().nullable(),
    data: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.categoriaId !== NOVA_CATEGORIA_GASTO_VALUE || Boolean(data.novaCategoriaNome?.trim()), {
    message: "Informe o nome da nova categoria",
    path: ["novaCategoriaNome"],
  });
export type DespesaAvulsaInput = z.infer<typeof despesaAvulsaSchema>;

/** Mesmo formato de despesaAvulsaSchema, para despesas avulsas da Base — sem vínculo com jogos
 * (fora de escopo), mais `categoria` (idade) opcional: vazio = despesa geral da Base, não amarrada
 * a uma categoria específica (ver docs/superpowers/specs/2026-08-19-financeiro-base-design.md). */
export const despesaAvulsaBaseSchema = z
  .object({
    categoriaId: z.string().min(1, { message: "Categoria é obrigatória" }),
    novaCategoriaNome: z.string().optional().or(z.literal("")),
    categoria: z
      .enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"])
      .optional()
      .or(z.literal("")),
    descricao: z.string().optional().or(z.literal("")),
    valorPrevisto: z.coerce.number().nonnegative({ message: "Valor previsto não pode ser negativo" }),
    valorEfetuado: z.coerce.number().nonnegative().optional().nullable(),
    data: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.categoriaId !== NOVA_CATEGORIA_GASTO_VALUE || Boolean(data.novaCategoriaNome?.trim()), {
    message: "Informe o nome da nova categoria",
    path: ["novaCategoriaNome"],
  });
export type DespesaAvulsaBaseInput = z.infer<typeof despesaAvulsaBaseSchema>;

/** Ordem fixa e numerada dos tipos de solicitação — a mesma ordem aparece no seletor do
 * formulário, no filtro da listagem e na própria listagem. */
export const SOLICITACAO_TIPOS = [
  { value: "compra", label: "01 · Compra" },
  { value: "pagamento", label: "02 · Pagamento" },
  { value: "reembolso", label: "03 · Reembolso" },
  { value: "passagem_aerea", label: "04 · Passagem Aérea" },
  { value: "exame_medico", label: "05 · Exame Médico" },
  { value: "transporte", label: "06 · Transporte" },
  { value: "hospedagem", label: "07 · Hospedagem" },
] as const;

export const SOLICITACAO_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
  { value: "concluida", label: "Concluída" },
] as const;

/** Tipo de conta bancária, usado junto com (ou no lugar de) a Chave PIX em Pagamento/Reembolso. */
export const TIPO_CONTA_BANCARIA = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
] as const;

export const solicitacaoSchema = z
  .object({
    tipo: z.enum(
      ["compra", "pagamento", "exame_medico", "reembolso", "passagem_aerea", "transporte", "hospedagem"],
      {
        errorMap: () => ({ message: "Tipo é obrigatório" }),
      },
    ),
    dataSolicitacao: z.string().min(1, { message: "Data é obrigatória" }),
    solicitante: z.string().min(1, { message: "Solicitante é obrigatório" }),
    setor: z.string().min(1, { message: "Setor é obrigatório" }),
    descricaoNecessidade: z.string().optional().or(z.literal("")),
    prazoSugerido: z.string().optional().or(z.literal("")),
    // Em Pagamento/Reembolso, o valor final é sempre calculado a partir da soma dos itens (ver
    // salvarItensInline em app/solicitacoes/actions.ts) — este campo não é mais preenchido pelo
    // formulário, mas fica aqui pra não quebrar o parse.
    valor: z.coerce.number().nonnegative().optional().nullable(),
    chavePix: z.string().optional().or(z.literal("")),
    chavePixTipo: chavePixTipoField,
    // Dados bancários — sempre opcionais (em Pagamento/Reembolso, a pessoa preenche a Chave PIX
    // e/ou os dados bancários, o que for mais conveniente).
    banco: z.string().optional().or(z.literal("")),
    agencia: z.string().optional().or(z.literal("")),
    conta: z.string().optional().or(z.literal("")),
    tipoConta: z.enum(["corrente", "poupanca"]).optional().or(z.literal("")),
    titularConta: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.tipo !== "reembolso" || Boolean(data.chavePix?.trim()), {
    message: "Chave PIX é obrigatória em Reembolso",
    path: ["chavePix"],
  })
  .refine(
    (data) =>
      ["passagem_aerea", "transporte", "hospedagem"].includes(data.tipo) ||
      Boolean(data.descricaoNecessidade?.trim()),
    {
      message: "Descrição da necessidade é obrigatória",
      path: ["descricaoNecessidade"],
    },
  )
  .refine((data) => chavePixValida(data.chavePix, data.chavePixTipo), {
    message: "Chave PIX incompleta para o tipo selecionado",
    path: ["chavePix"],
  });
export type SolicitacaoInput = z.infer<typeof solicitacaoSchema>;

export const solicitacaoStatusSchema = z.object({
  status: z.enum(["pendente", "aprovada", "recusada", "concluida"]),
});

export const solicitacaoItemSchema = z.object({
  quantidade: z.string().min(1, { message: "Quantidade é obrigatória" }),
  item: z.string().min(1, { message: "Item é obrigatório" }),
  observacao: z.string().optional().or(z.literal("")),
});
export type SolicitacaoItemInput = z.infer<typeof solicitacaoItemSchema>;

/** Item de Pagamento/Reembolso — usado tanto pra adicionar quanto pra editar um item já existente
 * (ver app/solicitacoes/[id]/itens/actions.ts). */
export const solicitacaoItemPagamentoSchema = z.object({
  descricao: z.string().min(1, { message: "Descrição é obrigatória" }),
  valor: z.coerce.number().positive({ message: "Valor deve ser maior que zero" }),
  observacao: z.string().optional().or(z.literal("")),
});
export type SolicitacaoItemPagamentoInput = z.infer<typeof solicitacaoItemPagamentoSchema>;

/** Item (passageiro/trecho) de Passagem Aérea — usado tanto pra adicionar quanto pra editar. */
export const solicitacaoItemPassagemSchema = z.object({
  passageiro: z.string().min(1, { message: "Passageiro é obrigatório" }),
  origem: z.string().optional().or(z.literal("")),
  destino: z.string().optional().or(z.literal("")),
  dataVoo: z.string().optional().or(z.literal("")),
  horarioVoo: z.string().optional().or(z.literal("")),
  observacao: z.string().optional().or(z.literal("")),
});
export type SolicitacaoItemPassagemInput = z.infer<typeof solicitacaoItemPassagemSchema>;

/** Item (passageiro/viagem) de Transporte — mesmo formato de campos de Passagem Aérea (reaproveita
 * as mesmas colunas: passageiro/origem/destino/data_voo/horario_voo), mais Valor, já que Transporte
 * é um tipo de solicitação separado de Passagem Aérea. */
export const solicitacaoItemTransporteSchema = z.object({
  passageiro: z.string().min(1, { message: "Passageiro é obrigatório" }),
  origem: z.string().optional().or(z.literal("")),
  destino: z.string().optional().or(z.literal("")),
  dataVoo: z.string().optional().or(z.literal("")),
  horarioVoo: z.string().optional().or(z.literal("")),
  valor: z.coerce.number().nonnegative().optional().nullable(),
  observacao: z.string().optional().or(z.literal("")),
});
export type SolicitacaoItemTransporteInput = z.infer<typeof solicitacaoItemTransporteSchema>;

/** Item (reserva) de Hospedagem — usado tanto pra adicionar quanto pra editar. */
export const solicitacaoItemHospedagemSchema = z.object({
  passageiro: z.string().min(1, { message: "Passageiro é obrigatório" }),
  cidade: z.string().optional().or(z.literal("")),
  hotel: z.string().optional().or(z.literal("")),
  dataEntrada: z.string().optional().or(z.literal("")),
  dataSaida: z.string().optional().or(z.literal("")),
  tipoAcomodacao: z.string().optional().or(z.literal("")),
  valor: z.coerce.number().nonnegative().optional().nullable(),
  observacao: z.string().optional().or(z.literal("")),
});
export type SolicitacaoItemHospedagemInput = z.infer<typeof solicitacaoItemHospedagemSchema>;

/** Item (paciente/exame) de Exame Médico — reaproveita passageiro/item/observacao (Nome do
 * Paciente/Exame/Observação) e origem/destino/dataVoo/horarioVoo pro trecho de IDA do transporte
 * (mesmas colunas de Passagem Aérea/Transporte, não usadas por Exame Médico pra outra coisa); o
 * trecho de VOLTA tem campos próprios. `houveTransporte` chega como "sim"/"nao" de um toggle no
 * formulário — só quando "sim" a caixa de ida/volta é exigida no formulário (a validação em si
 * não obriga nenhum desses campos, pra não travar quem preencher parcialmente). */
export const solicitacaoItemExameMedicoSchema = z.object({
  passageiro: z.string().min(1, { message: "Nome é obrigatório" }),
  item: z.string().min(1, { message: "Exame é obrigatório" }),
  dataExame: z.string().optional().or(z.literal("")),
  localExame: z.string().optional().or(z.literal("")),
  observacao: z.string().optional().or(z.literal("")),
  houveTransporte: z.enum(["sim", "nao"]).optional().or(z.literal("")),
  origem: z.string().optional().or(z.literal("")),
  destino: z.string().optional().or(z.literal("")),
  dataVoo: z.string().optional().or(z.literal("")),
  horarioVoo: z.string().optional().or(z.literal("")),
  origemVolta: z.string().optional().or(z.literal("")),
  destinoVolta: z.string().optional().or(z.literal("")),
  dataVolta: z.string().optional().or(z.literal("")),
  horarioVolta: z.string().optional().or(z.literal("")),
});
export type SolicitacaoItemExameMedicoInput = z.infer<typeof solicitacaoItemExameMedicoSchema>;

export const configuracaoFinanceiroSchema = z.object({
  assinatura1Nome: z.string().min(1, { message: "Nome é obrigatório" }),
  assinatura1Cargo: z.string().min(1, { message: "Cargo é obrigatório" }),
  assinatura2Nome: z.string().min(1, { message: "Nome é obrigatório" }),
  assinatura2Cargo: z.string().min(1, { message: "Cargo é obrigatório" }),
  // Vínculo com um login do sistema (ver docs/superpowers/specs/2026-08-28-assinatura-digital-
  // notificacoes-design.md, Fase 2) — opcional: string vazia = "não vincular ainda" (assinatura
  // digital cai no fallback de qualquer "master" poder assinar aquele papel).
  assinatura1UsuarioId: z.string().optional(),
  assinatura2UsuarioId: z.string().optional(),
});
export type ConfiguracaoFinanceiroInput = z.infer<typeof configuracaoFinanceiroSchema>;

/** Configuração do Encarregado do Departamento que assina digitalmente as Solicitações (ver
 * docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md, Fase 2) — nome/cargo
 * não são obrigatórios (diferente do Financeiro): a config nasce em branco, o Mateus preenche
 * quando quiser começar a usar assinatura digital nas Solicitações. */
export const configuracaoSolicitacoesSchema = z.object({
  encarregadoNome: z.string(),
  encarregadoCargo: z.string(),
  encarregadoUsuarioId: z.string().optional(),
  comprasCargo: z.string(),
  comprasUsuarioId: z.string().optional(),
  financeiroCargo: z.string(),
  financeiroUsuarioId: z.string().optional(),
  aprovadorCargo: z.string(),
  aprovadorUsuarioId: z.string().optional(),
});
export type ConfiguracaoSolicitacoesInput = z.infer<typeof configuracaoSolicitacoesSchema>;

/** Fase 3 — vincular o papel "Departamento" do Relatório de Dispensa a um login específico (nem
 * sempre é o Mateus). Sem nome/cargo: o rótulo já é fixo ("Departamento de Futebol de Base"), só
 * precisa saber QUEM. */
export const configuracaoDispensaSchema = z.object({
  departamentoUsuarioId: z.string().optional(),
});
export type ConfiguracaoDispensaInput = z.infer<typeof configuracaoDispensaSchema>;

/** As três listas de Estoque — Esportivo, Medicamentos e Materiais — totalmente independentes umas
 * das outras (catálogo, entradas, saídas e histórico próprios).
 *
 * `departamento` é só rótulo de tela e de documento: Medicamentos e Materiais são as **duas listas do
 * Departamento Médico** (remédio de um lado, material de consumo do outro), e sem essa linha a
 * separação entre elas parece arbitrária pra quem abre a tela.
 *
 * O `value` de Medicamentos continua sendo "medico": é o que está gravado em `estoque_itens`,
 * `estoque_entradas`, `estoque_saidas` e na permissão de cada perfil. Só o rótulo mudou (ver
 * 0072_estoque_materiais.sql). */
export const ESTOQUE_CATEGORIAS = [
  { value: "esportivo", label: "Esportivo", departamento: "Futebol Profissional" },
  { value: "medico", label: "Medicamentos", departamento: "Departamento Médico" },
  { value: "materiais", label: "Materiais", departamento: "Departamento Médico" },
] as const;

/** Valor sentinela usado no <select> de item da Entrada (ver EntradaItensFields em
 * app/estoque/[categoria]/movimento-itens-fields.tsx) pra indicar "+ Cadastrar item novo" em vez de
 * um item já existente no catálogo — mesmo padrão de NOVA_FUNCAO_VALUE/NOVA_CATEGORIA_GASTO_VALUE
 * acima. Ver resolverItensEntrada em app/estoque/[categoria]/actions.ts. */
export const ESTOQUE_ITEM_NOVO_VALUE = "__novo__";

/** Mesmas opções de departamento da ficha de Saída em papel já usada pelo clube. */
export const ESTOQUE_DEPARTAMENTOS = [
  "Administrativo",
  "Técnico",
  "Médico",
  "Operacional",
  "Limpeza",
  "Lavanderia",
  "Serviços Gerais",
  "Portaria",
  "Outros",
] as const;

export const estoqueItemSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  codigo: z.string().optional().or(z.literal("")),
  mg: z.string().optional().or(z.literal("")),
});
export type EstoqueItemInput = z.infer<typeof estoqueItemSchema>;

export const estoqueSaidaSchema = z.object({
  data: z.string().min(1, { message: "Data é obrigatória" }),
  nomeDestinatario: z.string().min(1, { message: "Nome do destinatário é obrigatório" }),
  funcao: z.string().optional().or(z.literal("")),
  departamento: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});
export type EstoqueSaidaInput = z.infer<typeof estoqueSaidaSchema>;

export const estoqueEntradaSchema = z.object({
  data: z.string().min(1, { message: "Data é obrigatória" }),
  fornecedor: z.string().optional().or(z.literal("")),
  notaFiscal: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});
export type EstoqueEntradaInput = z.infer<typeof estoqueEntradaSchema>;

export const ingressoCargaSchema = z.object({
  quantidade: z.coerce.number().int({ message: "Quantidade deve ser um número inteiro" }).positive({
    message: "Quantidade deve ser maior que zero",
  }),
  data: z.string().min(1, { message: "Data é obrigatória" }),
  observacoes: z.string().optional().or(z.literal("")),
});
export type IngressoCargaInput = z.infer<typeof ingressoCargaSchema>;

export const ingressoSolicitacaoSchema = z.object({
  nomeSolicitante: z.string().min(1, { message: "Nome do solicitante é obrigatório" }),
  quantidadeSolicitada: z.coerce
    .number()
    .int({ message: "Quantidade solicitada deve ser um número inteiro" })
    .positive({ message: "Quantidade solicitada deve ser maior que zero" }),
  quantidadeAtendida: z.coerce
    .number()
    .int({ message: "Quantidade atendida deve ser um número inteiro" })
    .nonnegative({ message: "Quantidade atendida não pode ser negativa" })
    .optional(),
  observacoes: z.string().optional().or(z.literal("")),
});
export type IngressoSolicitacaoInput = z.infer<typeof ingressoSolicitacaoSchema>;

/** Rótulo de cada categoria pro <select> do formulário "+ Adicionar" do widget "Calendário" (Home
 * do Futebol Profissional) — cor de cada uma fica em `lib/futebol/calendario.ts`
 * (`CATEGORIAS_EVENTO`), perto de onde é desenhada. */
export const CATEGORIAS_EVENTO_CALENDARIO = [
  { value: "treino", label: "Treino" },
  { value: "viagem", label: "Viagem" },
  { value: "reuniao", label: "Reunião" },
  { value: "prazo", label: "Prazo administrativo" },
  { value: "outro", label: "Outro" },
] as const;

export const eventoCalendarioSchema = z.object({
  categoria: z.enum(["treino", "viagem", "reuniao", "prazo", "outro"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  titulo: z.string().min(1, { message: "Título é obrigatório" }),
  data: z.string().min(1, { message: "Data é obrigatória" }),
  horario: z.string().optional().or(z.literal("")),
  observacao: z.string().optional().or(z.literal("")),
});
export type EventoCalendarioInput = z.infer<typeof eventoCalendarioSchema>;

/** Tipo de cada atividade da Programação Semanal do treinador (ver
 * docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md) — rótulo pro <select> do
 * formulário de Nova Atividade e pra colorir a grade. "Jogo Oficial"/"Jogo Treino" usam
 * `criarAtividadeDeJogoSchema` abaixo, não este formulário (horário/local vêm de `jogos_base`, não
 * são digitados). */
export const PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS = [
  { value: "programacao", label: "Programação" },
  { value: "refeicao", label: "Refeição" },
  { value: "academia", label: "Academia" },
  { value: "treinamento", label: "Treinamento" },
  { value: "transporte", label: "Transporte" },
  { value: "imprensa", label: "Imprensa" },
  { value: "regenerativo", label: "Regenerativo" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "cafe_manha", label: "Café da Manhã" },
  { value: "video", label: "Vídeo" },
] as const;

const PROGRAMACAO_ATIVIDADE_TIPOS_NAO_JOGO = [
  "programacao",
  "refeicao",
  "academia",
  "treinamento",
  "transporte",
  "imprensa",
  "regenerativo",
  "apresentacao",
  "cafe_manha",
  "video",
] as const;

/** Formulário de "+ Nova Atividade" da Programação Semanal, pra qualquer tipo que não seja jogo
 * (esses usam `criarAtividadeDeJogoSchema`, que troca horário/local por um jogo já cadastrado). */
export const criarAtividadeSchema = z.object({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11", "profissional"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  data: z.string().min(1, { message: "Data é obrigatória" }),
  nome: z.string().min(1, { message: "Nome da atividade é obrigatório" }),
  tipo: z.enum(PROGRAMACAO_ATIVIDADE_TIPOS_NAO_JOGO, {
    errorMap: () => ({ message: "Tipo é obrigatório" }),
  }),
  horarioInicio: z.string().min(1, { message: "Horário de início é obrigatório" }),
  horarioTermino: z.string().optional().or(z.literal("")),
  local: z.string().optional().or(z.literal("")),
});
export type CriarAtividadeInput = z.infer<typeof criarAtividadeSchema>;

/** "Editar Atividade" (mesmo formulário de criar, ver `components/programacao/nova-atividade-
 * modal.tsx` — pedido do Mateus de 18/09, antes só dava pra criar e visualizar) — mesmos campos de
 * `criarAtividadeSchema` mais o `id` de qual atividade está sendo alterada. */
export const atualizarAtividadeSchema = criarAtividadeSchema.extend({
  id: z.string().min(1, { message: "Atividade inválida" }),
});
export type AtualizarAtividadeInput = z.infer<typeof atualizarAtividadeSchema>;

/** "+ Nova Atividade" quando o tipo é Jogo Oficial/Jogo Treino — em vez de digitar horário/local,
 * escolhe um jogo já cadastrado em `jogos_base` daquela categoria (ver spec, "Atividade de jogo não
 * duplica dado"). */
export const criarAtividadeDeJogoSchema = z.object({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11", "profissional"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  tipo: z.enum(["jogo_oficial", "jogo_treino"], {
    errorMap: () => ({ message: "Tipo é obrigatório" }),
  }),
  jogoId: z.string().min(1, { message: "Selecione o jogo" }),
});
export type CriarAtividadeDeJogoInput = z.infer<typeof criarAtividadeDeJogoSchema>;

/** "Editar Atividade" quando o tipo é Jogo Oficial/Jogo Treino — mesmos campos de
 * `criarAtividadeDeJogoSchema` mais o `id` de qual atividade está sendo alterada. */
export const atualizarAtividadeDeJogoSchema = criarAtividadeDeJogoSchema.extend({
  id: z.string().min(1, { message: "Atividade inválida" }),
});
export type AtualizarAtividadeDeJogoInput = z.infer<typeof atualizarAtividadeDeJogoSchema>;

/** "Copiar Dia" da Programação Semanal (ver spec, Parte 1) — copia as atividades de `dataOrigem`
 * pra uma ou mais `datasDestino`, de qualquer semana. Mesmo padrão de array-de-enum usado em
 * `comissaoTecnicaBaseSchema.categorias`, aqui pra um array de datas em vez de categorias. */
export const copiarDiaProgramacaoSchema = z.object({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11", "profissional"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  dataOrigem: z.string().min(1, { message: "Data de origem é obrigatória" }),
  datasDestino: z
    .array(z.string().min(1))
    .min(1, { message: "Selecione ao menos uma data de destino" }),
});
export type CopiarDiaProgramacaoInput = z.infer<typeof copiarDiaProgramacaoSchema>;

/** "+ Nova Subatividade", dentro do detalhe de uma atividade — só os campos que viram coluna de
 * verdade (o resto do formulário rico, ainda instável, vai em `config` jsonb — ver spec, "Por que
 * config jsonb"). */
export const criarSubatividadeSchema = z.object({
  nome: z.string().min(1, { message: "Nome da subatividade é obrigatório" }),
  duracaoBlocos: z.coerce
    .number()
    .int({ message: "Duração deve ser um número inteiro de blocos" })
    .positive({ message: "Duração deve ser maior que zero" })
    .optional()
    .nullable(),
  intervaloMin: z.coerce
    .number()
    .int({ message: "Intervalo deve ser um número inteiro de minutos" })
    .nonnegative({ message: "Intervalo não pode ser negativo" })
    .optional()
    .nullable(),
  videoUrl: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});
export type CriarSubatividadeInput = z.infer<typeof criarSubatividadeSchema>;
