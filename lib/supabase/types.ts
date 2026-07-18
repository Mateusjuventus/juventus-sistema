/**
 * Tipos das linhas das tabelas do Supabase, espelhando
 * supabase/migrations/0001_init.sql. Mantidos manualmente por enquanto;
 * podem ser substituídos por `supabase gen types typescript` no futuro.
 */

export type PeDominante = "destro" | "canhoto" | "ambidestro";
export type AtletaStatus = "liberado" | "suspenso" | "departamento_medico";
export type TipoQuarto = "single" | "duplo";

export interface AtletaRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  posicao: string;
  numero_camisa: number | null;
  pe_dominante: PeDominante | null;
  telefone: string | null;
  cidade_natal: string | null;
  uf_natal: string | null;
  endereco_atual: string | null;
  data_inicio_clube: string | null;
  empresario_nome: string | null;
  foto_path: string | null;
  status: AtletaStatus;
  data_fim_contrato: string | null;
  apelido: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComissaoTecnicaRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  funcao: string;
  telefone: string | null;
  email: string | null;
  foto_path: string | null;
  tipo_quarto_preferido: TipoQuarto | null;
  apelido: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffFuncaoCatalogoRow {
  id: string;
  nome: string;
  created_at: string;
}

export type StaffChavePixTipo = "cpf" | "cnpj" | "email" | "telefone";

export interface StaffOperacionalRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  funcao_id: string;
  telefone: string | null;
  chave_pix: string | null;
  chave_pix_tipo: StaffChavePixTipo | null;
  valor_padrao_pagamento: number | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
  foto_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha de staff_operacional já com a função embutida via join (`funcao:staff_funcoes_catalogo(nome)`). */
export interface StaffOperacionalComFuncaoRow extends StaffOperacionalRow {
  funcao: { nome: string } | null;
}

export interface JogoRow {
  id: string;
  competicao: string;
  rodada_fase: string | null;
  adversario_nome: string;
  adversario_logo_path: string | null;
  data_jogo: string;
  horario: string | null;
  local_estadio: string | null;
  endereco: string | null;
  mandante: boolean;
  gols_pro: number | null;
  gols_contra: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ConvocacaoAtletaStatus = "titular" | "reserva";

export interface ConvocacaoRow {
  id: string;
  jogo_id: string;
  capitao_atleta_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConvocacaoAtletaRow {
  convocacao_id: string;
  atleta_id: string;
  status: ConvocacaoAtletaStatus;
}

export interface ConvocacaoComissaoRow {
  convocacao_id: string;
  comissao_id: string;
}

export interface ConvocacaoStaffRow {
  convocacao_id: string;
  staff_id: string;
}

export interface RoomingListRow {
  id: string;
  jogo_id: string;
  hotel_nome: string | null;
  hotel_endereco: string | null;
  checkin: string | null;
  checkout: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PessoaTipoRooming = "atleta" | "comissao" | "staff";

export interface RoomingListQuartoRow {
  id: string;
  rooming_list_id: string;
  tipo: TipoQuarto;
  ordem: number;
}

export interface RoomingListOcupanteRow {
  quarto_id: string;
  pessoa_tipo: PessoaTipoRooming;
  pessoa_id: string;
}

export interface OnibusListaRow {
  id: string;
  jogo_id: string;
  onibus_numero: number;
  horario_saida: string | null;
  created_by: string | null;
  created_at: string;
}

export type PessoaTipoOnibus = "atleta" | "comissao" | "staff";

export interface OnibusPassageiroRow {
  onibus_lista_id: string;
  pessoa_tipo: PessoaTipoOnibus;
  pessoa_id: string;
}

export interface CredenciamentoCatalogoRow {
  id: string;
  zona: string;
  zona_cor: string | null;
  funcao: string;
  vagas_totais: number;
}

export type PessoaTipoCredenciamento = "comissao" | "staff";

export interface CredenciamentoJogoRow {
  id: string;
  jogo_id: string;
  credenciamento_catalogo_id: string;
  pessoa_tipo: PessoaTipoCredenciamento;
  pessoa_id: string;
  vaga_extra: boolean;
  created_at: string;
}

export type PessoaTipoRecibo = "comissao" | "staff";
export type ChavePixTipo = "celular" | "email" | "cpf" | "aleatoria";

export interface ReciboJogoRow {
  id: string;
  jogo_id: string;
  pessoa_tipo: PessoaTipoRecibo;
  pessoa_id: string;
  funcao_jogo: string | null;
  valor: number | null;
  chave_pix: string | null;
  chave_pix_tipo: ChavePixTipo | null;
  pago: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TarefaCategoria = "logistica" | "registro" | "financeiro" | "solicitacoes" | "gerais";
export type TarefaStatus = "pendente" | "em_andamento" | "solicitado" | "concluido";

export interface TarefaRow {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: TarefaCategoria;
  status: TarefaStatus;
  prazo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoriaGastoRow {
  id: string;
  nome: string;
  created_at: string;
}

export interface GastoJogoRow {
  id: string;
  jogo_id: string;
  categoria_id: string;
  descricao: string | null;
  valor_previsto: number;
  valor_efetuado: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha de gastos_jogo já com a categoria embutida via join (`categoria:categorias_gasto(nome)`). */
export interface GastoJogoComCategoriaRow extends GastoJogoRow {
  categoria: { nome: string } | null;
}

/**
 * Configurações do módulo Financeiro — tabela singleton (sempre uma linha só) com as duas
 * assinaturas usadas nos PDFs (Orçamento Previsto e Relatório Geral).
 */
export interface ConfiguracaoFinanceiroRow {
  id: string;
  assinatura1_nome: string;
  assinatura1_cargo: string;
  assinatura2_nome: string;
  assinatura2_cargo: string;
  updated_at: string;
}

/**
 * Liga/desliga o link público de autocadastro de Staff Operacional (/cadastro-staff) — tabela
 * singleton (sempre uma linha só).
 */
export interface ConfiguracaoCadastroStaffRow {
  id: string;
  cadastro_publico_ativo: boolean;
  updated_at: string;
}

/**
 * Item do checklist de preparação de um jogo. Os itens são criados automaticamente a partir de um
 * modelo fixo (ver lib/checklist-templates.ts) na primeira vez que a aba "Checklist" do jogo é
 * aberta — a lista de itens muda conforme o jogo é em casa ou fora.
 */
export interface ChecklistJogoItemRow {
  id: string;
  jogo_id: string;
  item: string;
  concluido: boolean;
  prazo: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/** Linha de checklist_jogo_itens já com os dados do jogo embutidos via join (`jogo:jogos(...)`). */
export interface ChecklistJogoItemComJogoRow extends ChecklistJogoItemRow {
  jogo: { id: string; adversario_nome: string; data_jogo: string; mandante: boolean } | null;
}

export type SolicitacaoTipo = "compra" | "pagamento" | "exame_medico" | "reembolso" | "passagem_aerea";
export type SolicitacaoStatus = "pendente" | "aprovada" | "recusada" | "concluida";
export type SolicitacaoTipoConta = "corrente" | "poupanca";

/**
 * Solicitação formal (Compra, Pagamento, Exame Médico, Reembolso ou Passagem Aérea), gerada no
 * modelo de PDF do clube. `valor` só é usado em Pagamento/Reembolso, e é calculado automaticamente
 * como a soma dos itens (ver SolicitacaoItemRow); `chave_pix`/`chave_pix_tipo` e os dados bancários
 * (`banco`/`agencia`/`conta`/`tipo_conta`/`titular_conta`) são usados em Pagamento e Reembolso —
 * ambos opcionais, a pessoa preenche o que for mais conveniente pro caso.
 * `passageiro`/`origem`/`destino`/`data_voo`/`horario_voo` não são mais preenchidos (ficaram em
 * solicitacao_itens, já que uma Passagem Aérea pode ter vários passageiros) — as colunas continuam
 * aqui só por compatibilidade com registros antigos.
 */
export interface SolicitacaoRow {
  id: string;
  tipo: SolicitacaoTipo;
  data_solicitacao: string;
  solicitante: string;
  setor: string;
  descricao_necessidade: string | null;
  prazo_sugerido: string | null;
  valor: number | null;
  chave_pix: string | null;
  chave_pix_tipo: StaffChavePixTipo | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: SolicitacaoTipoConta | null;
  titular_conta: string | null;
  passageiro: string | null;
  origem: string | null;
  destino: string | null;
  data_voo: string | null;
  horario_voo: string | null;
  status: SolicitacaoStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Item de uma solicitação — o significado dos campos depende do tipo da solicitação "pai":
 * - Compra: quantidade + item + foto_path
 * - Pagamento / Reembolso: descricao + observacao (opcional) + valor
 * - Passagem Aérea: passageiro + origem + destino + data_voo + horario_voo + observacao (opcional)
 * Exame Médico não usa itens. Todos os campos além de id/solicitacao_id/ordem/created_at são
 * opcionais, já que cada solicitação só preenche o conjunto relevante ao seu tipo.
 */
export interface SolicitacaoItemRow {
  id: string;
  solicitacao_id: string;
  quantidade: string | null;
  item: string | null;
  foto_path: string | null;
  descricao: string | null;
  observacao: string | null;
  valor: number | null;
  passageiro: string | null;
  origem: string | null;
  destino: string | null;
  data_voo: string | null;
  horario_voo: string | null;
  ordem: number;
  created_at: string;
}

export type EstoqueCategoria = "esportivo" | "medico";

/**
 * Item do catálogo de Estoque — Esportivo e Médico são duas listas totalmente independentes,
 * nunca se misturam (nem no catálogo, nem em Entradas/Saídas). `tamanhos` guarda a quantidade de
 * cada tamanho/variação num objeto só (ex: {"P": 12, "M": 20, "Único": 5}) — o item inteiro é uma
 * linha só, não uma linha por tamanho. A quantidade só muda através de Entrada (soma) ou Saída
 * (subtrai); editar o item corrige nome/código/tamanhos diretamente, pra consertar um engano.
 * No Médico, o mesmo campo `tamanhos` guarda as unidades de medida (ex: {"Caixa": 4, "Unidade": 10})
 * em vez de tamanhos de roupa — só muda o rótulo mostrado na tela, o dado é o mesmo. `mg` é usado só
 * pelo Médico (dosagem/concentração, ex: "500mg"), opcional e não usado no Esportivo.
 */
export interface EstoqueItemRow {
  id: string;
  categoria: EstoqueCategoria;
  nome: string;
  codigo: string | null;
  mg: string | null;
  tamanhos: Record<string, number>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ficha de Saída (retirada de material por um colaborador) — "numero" é sequencial e independente
 * por categoria (Esportivo e Médico cada um com sua própria contagem 0001, 0002...).
 */
export interface EstoqueSaidaRow {
  id: string;
  categoria: EstoqueCategoria;
  numero: number;
  data: string;
  nome_destinatario: string;
  funcao: string | null;
  departamento: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EstoqueSaidaItemRow {
  id: string;
  saida_id: string;
  item_id: string | null;
  nome: string;
  tamanho: string | null;
  codigo: string | null;
  quantidade: number;
  ordem: number;
  created_at: string;
}

/** Entrada de estoque (reposição/material que chegou) — registro simples, sem assinatura; soma
 * direto nas quantidades do item. "numero" também sequencial e independente por categoria, numa
 * contagem separada da de Saídas. */
export interface EstoqueEntradaRow {
  id: string;
  categoria: EstoqueCategoria;
  numero: number;
  data: string;
  fornecedor: string | null;
  nota_fiscal: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EstoqueEntradaItemRow {
  id: string;
  entrada_id: string;
  item_id: string | null;
  nome: string;
  tamanho: string | null;
  codigo: string | null;
  quantidade: number;
  ordem: number;
  created_at: string;
}

export type PerfilRole = "master" | "regular";

/** Papel de cada usuário logado — "master" pode excluir Entrada/Saída do Estoque, acessar a tela
 * de Usuários (/usuarios) e sempre tem acesso a todos os módulos, independente de
 * `modulos_permitidos`; "regular" usa só os módulos liberados pra ele (ver `lib/auth/modulos.ts`). */
export interface PerfilRow {
  id: string;
  email: string;
  role: PerfilRole;
  modulos_permitidos: string[];
  departamentos_permitidos: string[];
  tarefas_categorias_visiveis: string[];
  estoque_categorias_permitidas: string[];
  created_at: string;
}
