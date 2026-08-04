import { z } from "zod";
import { isValidCPF, normalizeCPF } from "./cpf";
import { chavePixValida } from "./chave-pix";
import { normalizarNomeProprio } from "./nome";

/** Regra de CPF compartilhada por todos os cadastros: 11 dígitos, dígito verificador válido. */
const cpfField = z
  .string()
  .transform(normalizeCPF)
  .refine((value) => value.length === 11, { message: "CPF deve ter 11 dígitos" })
  .refine(isValidCPF, { message: "CPF inválido" });

const rgField = z.string().min(1, { message: "RG é obrigatório" });

const telefoneField = z.string().optional().or(z.literal(""));

const emailField = z.string().email({ message: "E-mail inválido" }).optional().or(z.literal(""));

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

/** Campos de endereço compartilhados entre o cadastro interno e o formulário público de Staff. */
const enderecoFields = {
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

export const atletaSchema = z.object({
  nomeCompleto: z
    .string()
    .min(1, { message: "Nome completo é obrigatório" })
    .transform(normalizarNomeProprio),
  apelido: z.string().optional().or(z.literal("")),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  posicao: z.string().min(1, { message: "Posição é obrigatória" }),
  categoriaPosicao: z.enum(["goleiro", "zagueiro", "lateral", "meia", "atacante"], {
    errorMap: () => ({ message: "Categoria de posição é obrigatória" }),
  }),
  numeroCamisa: z.coerce.number().int().positive().optional().nullable(),
  numeroCbf: z.coerce.number().int().positive().optional().nullable(),
  numeroFpf: z.coerce.number().int().positive().optional().nullable(),
  peDominante: z.enum(["destro", "canhoto", "ambidestro"]).optional().nullable(),
  telefone: telefoneField,
  cidadeNatal: z.string().optional().or(z.literal("")),
  ufNatal: z.string().length(2).optional().or(z.literal("")),
  enderecoAtual: z.string().optional().or(z.literal("")),
  dataInicioClube: z.string().optional().or(z.literal("")),
  empresarioNome: z.string().optional().or(z.literal("")),
  status: z.enum(["liberado", "suspenso", "departamento_medico"]).default("liberado"),
  dataFimContrato: z.string().optional().or(z.literal("")),
  tipoContrato: z.enum(["definitivo", "emprestimo", "amador"]).optional().nullable(),
  possuiContratoFormacao: z.boolean().default(false),
});
export type AtletaInput = z.infer<typeof atletaSchema>;

/** Mesmo formulário de `atletaSchema`, mais a categoria de idade do Futebol de Base (Sub20 a
 * Sub11 — ver `lib/auth/categorias-base.ts`), obrigatória, e um tipo de contrato com uma opção a
 * mais (Iniciação — ver `ATLETA_BASE_TIPO_CONTRATO_OPTIONS`). */
export const atletaBaseSchema = atletaSchema.extend({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  tipoContrato: z.enum(["definitivo", "emprestimo", "amador", "iniciacao"]).optional().nullable(),
});
export type AtletaBaseInput = z.infer<typeof atletaBaseSchema>;

export const comissaoTecnicaSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
  apelido: z.string().optional().or(z.literal("")),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  funcao: z.string().min(1, { message: "Função/cargo é obrigatório" }),
  telefone: telefoneField,
  email: z.string().email({ message: "E-mail inválido" }).optional().or(z.literal("")),
  tipoQuartoPreferido: z.enum(["single", "duplo"]).optional().nullable(),
});
export type ComissaoTecnicaInput = z.infer<typeof comissaoTecnicaSchema>;

/** Mesmo formulário de `comissaoTecnicaSchema`, mais a categoria de idade do Futebol de Base
 * (obrigatória — ver `lib/auth/categorias-base.ts`). */
export const comissaoTecnicaBaseSchema = comissaoTecnicaSchema.extend({
  categoria: z.enum(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
});
export type ComissaoTecnicaBaseInput = z.infer<typeof comissaoTecnicaBaseSchema>;

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

/** As duas listas de Estoque — Esportivo e Médico — totalmente independentes uma da outra. */
export const ESTOQUE_CATEGORIAS = [
  { value: "esportivo", label: "Esportivo" },
  { value: "medico", label: "Médico" },
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
