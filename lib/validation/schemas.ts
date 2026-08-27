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

/** Tipo de contrato do Futebol Profissional — ver `AtletaTipoContrato` em `lib/supabase/types.ts`. */
export const ATLETA_TIPO_CONTRATO_OPTIONS = [
  { value: "definitivo", label: "Definitivo" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "amador", label: "Amador" },
] as const;

/** Tipo de contrato do Futebol de Base — mesmas opções do Profissional, mais Iniciação. */
export const ATLETA_BASE_TIPO_CONTRATO_OPTIONS = [
  ...ATLETA_TIPO_CONTRATO_OPTIONS,
  { value: "iniciacao", label: "Iniciação" },
] as const;

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

/** Campos compartilhados por `atletaSchema` (Profissional) e `atletaBaseSchema` (Base) — separado
 * do schema final porque os dois precisam de `.refine()` (checagem de alergia, ver
 * `refinarAlergia`), e um `ZodObject` refinado não pode mais ser `.extend()`ido — por isso o Base
 * estende este objeto "cru" antes de aplicar o refine, em vez de estender `atletaSchema` direto. */
const atletaCamposBase = z.object({
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
  numeroFpf: z.coerce.number().int().positive().optional().nullable(),
  peDominante: z.enum(["destro", "canhoto", "ambidestro"]).optional().nullable(),
  telefone: telefoneFieldValidado,
  cidadeNatal: z.string().optional().or(z.literal("")),
  ufNatal: z.string().length(2).optional().or(z.literal("")),
  enderecoAtual: z.string().optional().or(z.literal("")),
  dataInicioClube: z.string().optional().or(z.literal("")),
  // Distinto de `dataInicioClube` (quando o atleta entrou no clube) — restrito ao cadastro
  // interno, nunca aparece na Ficha de Cadastro pública (`fichaCadastroAtletaBaseSchema`), mesmo
  // raciocínio dos demais campos administrativos de contrato.
  dataInicioContrato: z.string().optional().or(z.literal("")),
  empresarioNome: z.string().optional().or(z.literal("")),
  status: z.enum(["liberado", "suspenso", "departamento_medico"]).default("liberado"),
  dataFimContrato: z.string().optional().or(z.literal("")),
  tipoContrato: z.enum(["definitivo", "emprestimo", "amador"]).optional().nullable(),
  possuiContratoFormacao: z.boolean().default(false),
  // Pedido de 25/08: "Possui alergia a algum medicamento? Se sim, qual". Opcional no cadastro
  // interno (a maioria dos campos do admin também é); a checagem de "se sim, qual é obrigatório"
  // vem do `refinarAlergia` aplicado abaixo.
  possuiAlergiaMedicamento: z.boolean().default(false),
  alergiaMedicamentoQual: z.string().optional().or(z.literal("")),
});

export const atletaSchema = atletaCamposBase.refine(refinoAlergia.check, refinoAlergia.options);
export type AtletaInput = z.infer<typeof atletaSchema>;

/** Mesmo formulário de `atletaSchema`, mais a categoria de idade do Futebol de Base (Sub20 a
 * Sub11 — ver `lib/auth/categorias-base.ts`), obrigatória, e um tipo de contrato com uma opção a
 * mais (Iniciação — ver `ATLETA_BASE_TIPO_CONTRATO_OPTIONS`). */
export const atletaBaseSchema = atletaCamposBase
  .extend({
    categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
      errorMap: () => ({ message: "Categoria é obrigatória" }),
    }),
    tipoContrato: z.enum(["definitivo", "emprestimo", "amador", "iniciacao"]).optional().nullable(),
    // Classificação G1/G2/G3 (ver docs/superpowers/specs/
    // 2026-08-25-classificacao-dispensa-atleta-base-design.md) — opcional, nem todo atleta precisa
    // estar classificado.
    classificacao: z.enum(["g1", "g2", "g3"]).optional().nullable(),
    // "dispensado" só existe no status do Base (ver `AtletaBaseStatus` em lib/supabase/types.ts) —
    // normalmente é a tela de Relatório de Dispensa que grava esse valor, mas o cadastro interno
    // também precisa aceitá-lo aqui, senão o <select> de Status (que já lista "Dispensado" pra
    // exibir corretamente um atleta já dispensado) rejeitaria o próprio valor atual ao salvar
    // qualquer outra alteração no formulário.
    status: z
      .enum(["liberado", "suspenso", "departamento_medico", "dispensado"])
      .default("liberado"),
    // Campos pedidos em 18/08 (ver 0076_captacao_alojamento_base.sql): alojamento, responsáveis,
    // empresário e endereço estruturado (autopreenchido por CEP — ver EnderecoFields). Todos
    // opcionais: a maioria chega aos poucos, não de uma vez.
    alojado: z.boolean().default(false),
    valorAjudaCusto: z.coerce.number().nonnegative().optional().nullable(),
    agencia: z.string().optional().or(z.literal("")),
    empresarioTelefone: telefoneField,
    maeNome: z.string().optional().or(z.literal("")),
    maeTelefone: telefoneFieldValidado,
    paiNome: z.string().optional().or(z.literal("")),
    paiTelefone: telefoneFieldValidado,
    escola: z.string().optional().or(z.literal("")),
    ...enderecoFields,
  })
  .refine(refinoAlergia.check, refinoAlergia.options);
export type AtletaBaseInput = z.infer<typeof atletaBaseSchema>;

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
export const captacaoInscricaoSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome do atleta é obrigatório" }).transform(normalizarNomeProprio),
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  posicao: inscricaoRequiredField("Posição é obrigatória"),
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  telefone: inscricaoRequiredField("Telefone é obrigatório"),
  indicacao: inscricaoRequiredField("Indicação é obrigatória"),
  clubeAnterior: inscricaoRequiredField("Clube anterior é obrigatório"),
  maeNome: inscricaoRequiredField("Nome da mãe é obrigatório"),
  maeTelefone: inscricaoRequiredField("Telefone da mãe é obrigatório"),
  paiNome: inscricaoRequiredField("Nome do pai é obrigatório"),
  paiTelefone: inscricaoRequiredField("Telefone do pai é obrigatório"),
  escola: inscricaoRequiredField("Escola é obrigatória"),
  cep: inscricaoRequiredField("CEP é obrigatório"),
  logradouro: inscricaoRequiredField("Endereço é obrigatório"),
  numero: inscricaoRequiredField("Número é obrigatório"),
  complemento: inscricaoRequiredField("Complemento é obrigatório"),
  bairro: inscricaoRequiredField("Bairro é obrigatório"),
  cidade: inscricaoRequiredField("Cidade é obrigatória"),
  uf: inscricaoRequiredField("UF é obrigatória"),
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

/** Campo obrigatório do formulário público de Comissão Técnica — TODOS os campos são obrigatórios
 * aqui (pedido do Mateus: "para o preenchimento da comissão, todos os dados devem ser
 * obrigatórios"), diferente do cadastro interno (`comissaoTecnicaSchema`), onde a maioria continua
 * opcional. Mesmo padrão de `inscricaoRequiredField`, usado na inscrição pública de Captação. */
function comissaoPublicoRequiredField(mensagem: string) {
  return z.string().min(1, { message: mensagem });
}

/** Formulário público de auto-cadastro da Comissão Técnica (`/cadastro-comissao-tecnica`,
 * Profissional) — ver seção 4 da spec de 25/08. Link único, sempre cria um cadastro novo. */
export const cadastroPublicoComissaoTecnicaSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }).transform(normalizarNomeProprio),
  apelido: comissaoPublicoRequiredField("Apelido é obrigatório"),
  rg: comissaoPublicoRequiredField("RG é obrigatório"),
  cpf: cpfField,
  dataNascimento: comissaoPublicoRequiredField("Data de nascimento é obrigatória"),
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

/** Mesmo formulário do público Profissional, mais categoria(s) obrigatórias — usado em
 * `/cadastro-comissao-tecnica-base`. */
export const cadastroPublicoComissaoTecnicaBaseSchema = cadastroPublicoComissaoTecnicaSchema.extend({
  categorias: z
    .array(z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"]))
    .min(1, { message: "Selecione ao menos uma categoria" }),
});
export type CadastroPublicoComissaoTecnicaBaseInput = z.infer<typeof cadastroPublicoComissaoTecnicaBaseSchema>;

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
 * ver `lib/auth/categorias-base.ts`). Mesmo padrão de `atletaBaseSchema`/`comissaoTecnicaBaseSchema`. */
export const jogoBaseSchema = jogoSchema.extend({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
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

const NOVA_CATEGORIA_GASTO_VALUE = "__nova__";

export const gastoJogoSchema = z
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
});
export type ConfiguracaoFinanceiroInput = z.infer<typeof configuracaoFinanceiroSchema>;

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
