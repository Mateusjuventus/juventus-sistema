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

/**
 * Solicitação formal (Compra, Pagamento, Exame Médico, Reembolso ou Passagem Aérea), gerada no
 * modelo de PDF do clube. `valor` só é usado em Pagamento/Reembolso, e é calculado automaticamente
 * como a soma dos itens (ver SolicitacaoItemRow); `chave_pix`/`chave_pix_tipo` só em Reembolso.
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
