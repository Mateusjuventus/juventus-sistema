/**
 * Tipos das linhas das tabelas do Supabase, espelhando
 * supabase/migrations/0001_init.sql. Mantidos manualmente por enquanto;
 * podem ser substituídos por `supabase gen types typescript` no futuro.
 */

export type PeDominante = "destro" | "canhoto" | "ambidestro";
export type AtletaStatus = "liberado" | "suspenso" | "departamento_medico";
export type TipoQuarto = "single" | "duplo" | "triplo";

/** Classificação fixa de posição, usada pra gerar a tag colorida (GOL/ZAG/LAT/MEI/ATA) na grade de
 * Convocação — ver `lib/futebol/categoria-posicao.ts`. Diferente do campo de texto livre
 * "posicao" (mais descritivo), que continua existindo como está. `null` quando o cadastro é
 * antigo e a migração de backfill não conseguiu classificar por palavra-chave. */
export type CategoriaPosicao = "goleiro" | "zagueiro" | "lateral" | "meia" | "atacante";

/** Tipo de contrato do atleta no Futebol Profissional — Amador libera o campo "possui contrato de
 * formação" no formulário (ver `AtletaForm`). O Futebol de Base tem uma opção a mais (Iniciação),
 * ver `AtletaBaseTipoContrato`. */
export type AtletaTipoContrato = "definitivo" | "emprestimo" | "amador";

export interface AtletaRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  posicao: string;
  categoria_posicao: CategoriaPosicao | null;
  numero_camisa: number | null;
  numero_cbf: number | null;
  numero_fpf: number | null;
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
  tipo_contrato: AtletaTipoContrato | null;
  possui_contrato_formacao: boolean;
  /** IdAtleta interno da FPF, gravado quando o vínculo é confirmado na tela "Elenco na FPF" — ver
   * docs/superpowers/specs/2026-08-04-integracao-fpf-design.md. Diferente de `numero_fpf`, que é
   * o número de registro/contrato (usado como sinal de sugestão automática de vínculo). Só
   * Futebol Profissional — `AtletaBaseRow` não tem esse campo. */
  fpf_id_atleta: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Documento anexado ao atleta (aba "Documentação" do perfil) — só nome livre + arquivo, sem
 * categoria fixa nem data de validade (ver docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md).
 * Pra corrigir um documento errado, exclui e reenvia — não tem edição de nome depois de enviado. */
export interface AtletaDocumentoRow {
  id: string;
  atleta_id: string;
  nome: string;
  arquivo_path: string;
  created_by: string | null;
  created_at: string;
}

/** Categorias de idade do Futebol de Base (Sub20 a Sub11) — ver `lib/auth/categorias-base.ts`. */
export type CategoriaBase = "sub20" | "sub17" | "sub15" | "sub14" | "sub13" | "sub12" | "sub11";

/** Tipo de contrato do atleta no Futebol de Base — mesmas opções de `AtletaTipoContrato`, mais
 * "Iniciação" (categorias mais jovens, sem vínculo formal ainda). */
export type AtletaBaseTipoContrato = "definitivo" | "emprestimo" | "amador" | "iniciacao";

/** Espelha `AtletaRow`, mas para o departamento Futebol de Base — tabela `atletas_base`, totalmente
 * independente de `atletas` (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md). */
export interface AtletaBaseRow {
  id: string;
  categoria: CategoriaBase;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  posicao: string;
  categoria_posicao: CategoriaPosicao | null;
  numero_camisa: number | null;
  numero_cbf: number | null;
  numero_fpf: number | null;
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
  tipo_contrato: AtletaBaseTipoContrato | null;
  possui_contrato_formacao: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Espelha `AtletaDocumentoRow`, mas para o Futebol de Base — tabela `atleta_documentos_base`. */
export interface AtletaDocumentoBaseRow {
  id: string;
  atleta_id: string;
  nome: string;
  arquivo_path: string;
  created_by: string | null;
  created_at: string;
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

/** Espelha `ComissaoTecnicaRow`, mas para o Futebol de Base — tabela `comissao_tecnica_base`, mais
 * `categoria` (ver `lib/auth/categorias-base.ts`). */
export interface ComissaoTecnicaBaseRow {
  id: string;
  categoria: CategoriaBase;
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

export type StaffChavePixTipo = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export interface StaffOperacionalRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  funcao_id: string;
  telefone: string | null;
  /** Serviço prestado por empresa terceirizada — quando true, chave_pix/chave_pix_tipo ficam
   * sempre nulos (o pagamento não é direto à pessoa) e funcao_terceirizada_id é obrigatório. */
  terceirizada: boolean;
  funcao_terceirizada_id: string | null;
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

/** Linha de staff_operacional já com a função (e a função da terceirizada, quando houver) embutidas
 * via join (`funcao:staff_funcoes_catalogo(nome)`, `funcao_terceirizada:staff_funcoes_catalogo(nome)`). */
export interface StaffOperacionalComFuncaoRow extends StaffOperacionalRow {
  funcao: { nome: string } | null;
  funcao_terceirizada: { nome: string } | null;
}

/** Espelha `StaffOperacionalRow`, mas para o Futebol de Base — tabela `staff_operacional_base`, sem
 * categoria (lista única, compartilhada — ver a spec). `funcao_id` referencia o mesmo catálogo
 * compartilhado `staff_funcoes_catalogo`. */
export interface StaffOperacionalBaseRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  funcao_id: string;
  telefone: string | null;
  terceirizada: boolean;
  funcao_terceirizada_id: string | null;
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

export interface StaffOperacionalBaseComFuncaoRow extends StaffOperacionalBaseRow {
  funcao: { nome: string } | null;
  funcao_terceirizada: { nome: string } | null;
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
  concentracao_data: string | null;
  concentracao_regras: string;
  dia_jogo_liberacao: string | null;
  /** Ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md. Só Futebol Profissional —
   * `JogoBaseRow` não tem esses campos. Opcionais (em vez de sempre presentes) só pra continuar
   * compatível com os componentes de PDF compartilhados (`lib/pdf/*`), que tipam `jogo` como
   * `JogoRow` mesmo quando recebem um `JogoBaseRow` de verdade (mesmo formato estrutural, ver
   * comentário desses arquivos) — nenhum desses componentes lê esses 3 campos novos. */
  fpf_id_jogo?: number | null;
  fpf_link_sumula?: string | null;
  fpf_sincronizado_em?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Atleta da FPF marcado como "não corresponde a ninguém daqui" na tela de vínculo de elenco. */
export interface FpfAtletaIgnoradoRow {
  fpf_id_atleta: number;
  nome: string;
  ignorado_por: string | null;
  ignorado_em: string;
}

export type ProgramacaoTipo = "concentracao" | "dia_jogo";

export interface JogoProgramacaoItemRow {
  id: string;
  jogo_id: string;
  tipo: ProgramacaoTipo;
  ordem: number;
  horario: string;
  atividade: string;
  local: string;
  eh_confronto: boolean;
  created_at: string;
}

export type ConvocacaoAtletaStatus = "titular" | "reserva";

export interface IngressoCargaRow {
  id: string;
  jogo_id: string;
  quantidade: number;
  data: string;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngressoSolicitacaoRow {
  id: string;
  jogo_id: string;
  nome_solicitante: string;
  quantidade_solicitada: number;
  quantidade_atendida: number;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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

export type SumulaEventoTipo = "gol" | "cartao_amarelo" | "cartao_vermelho" | "substituicao";
export type SumulaTempo = "primeiro" | "segundo";

/** Súmula do jogo — uma linha por jogo (`jogo_id` único). O placar em si continua vivendo em
 * `jogos.gols_pro`/`gols_contra` (única fonte de verdade, editável tanto na aba "Dados do jogo"
 * quanto aqui); esta tabela guarda só a duração de cada tempo. Ver
 * docs/superpowers/specs/2026-08-04-sumula-design.md. */
export interface SumulaRow {
  id: string;
  jogo_id: string;
  duracao_primeiro_tempo: number;
  duracao_segundo_tempo: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Evento da súmula (gol, cartão amarelo/vermelho, substituição) — cada um salvo individualmente
 * (sem lote), pra não perder lançamentos feitos ao vivo durante o jogo. `atleta_id` é quem fez o
 * gol / recebeu o cartão / saiu (substituição); `atleta_entrou_id` só é usado quando
 * tipo = "substituicao"; `atleta_assistencia_id` só é usado quando tipo = "gol", e é opcional
 * mesmo nesse caso. `ordem` desempata visualmente eventos com o mesmo tempo/minuto. */
export interface SumulaEventoRow {
  id: string;
  sumula_id: string;
  tipo: SumulaEventoTipo;
  tempo: SumulaTempo;
  minuto: number;
  atleta_id: string | null;
  atleta_entrou_id: string | null;
  atleta_assistencia_id: string | null;
  /** Nome do jogador do time ADVERSÁRIO que fez esse gol, quando o evento não é de um atleta
   * nosso (`atleta_id` fica null nesse caso) — usado pela importação de súmula em PDF, pra
   * registrar o placar completo mesmo sem ter esse jogador cadastrado. Só Futebol Profissional —
   * `SumulaEventoBaseRow` não tem essa coluna. */
  nome_adversario: string | null;
  /** true só quando `nome_adversario` é um gol CONTRA marcado por um jogador do adversário — esse
   * gol favorece o Juventus, ao contrário de um gol normal do adversário (que é contra nós). Sem
   * essa distinção os dois casos ficavam idênticos na tela (bug real de produção — ver
   * 0058_sumula_evento_gol_contra_favor.sql). Sempre false quando `nome_adversario` é null. */
  gol_contra_favor_juventus: boolean;
  ordem: number;
  created_by: string | null;
  created_at: string;
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
  numero_apartamento: string | null;
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

export interface ReciboJogoRow {
  id: string;
  jogo_id: string;
  pessoa_tipo: PessoaTipoRecibo;
  pessoa_id: string;
  funcao_jogo: string | null;
  valor: number | null;
  chave_pix: string | null;
  // Mesmo conjunto de tipos de Staff Operacional (ver StaffChavePixTipo) desde a migração 0039, que
  // unificou os tipos de chave PIX de Recibos de Jogos com os de Staff Operacional/Solicitações
  // (antes aceitava só 'celular'/'email'/'cpf'/'aleatoria', sem CNPJ e com "celular" em vez de
  // "telefone").
  chave_pix_tipo: StaffChavePixTipo | null;
  pago: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Categoria de evento manual do widget "Calendário" (`app/profissional/page.tsx`) — cor fixa por
 * categoria, ver `lib/futebol/calendario.ts`. Jogos não passam por aqui (vêm de `jogos` direto). */
export type EventoCalendarioCategoria = "treino" | "viagem" | "reuniao" | "prazo" | "outro";

export interface EventoCalendarioRow {
  id: string;
  categoria: EventoCalendarioCategoria;
  titulo: string;
  data: string;
  horario: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
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
  data: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha de gastos_jogo já com a categoria embutida via join (`categoria:categorias_gasto(nome)`). */
export interface GastoJogoComCategoriaRow extends GastoJogoRow {
  categoria: { nome: string } | null;
}

/** Despesa avulsa: gasto que não pertence a nenhum jogo (folha de pagamento, manutenção do CT,
 * etc.), mesmo formato de GastoJogoRow sem jogo_id — ver
 * docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md. */
export interface DespesaAvulsaRow {
  id: string;
  categoria_id: string;
  descricao: string | null;
  data: string | null;
  valor_previsto: number;
  valor_efetuado: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha de despesas_avulsas já com a categoria embutida via join. */
export interface DespesaAvulsaComCategoriaRow extends DespesaAvulsaRow {
  categoria: { nome: string } | null;
}

/** Vínculo N:N entre uma despesa avulsa e um jogo — só referência/etiqueta, não usado em nenhum
 * cálculo do resumo financeiro do jogo. */
export interface DespesaAvulsaJogoRow {
  despesa_id: string;
  jogo_id: string;
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

/** Mesma coisa, mas pro autocadastro de Staff Operacional do Futebol de Base (/cadastro-staff-base)
 * — tabela totalmente independente da do Profissional. */
export interface ConfiguracaoCadastroStaffBaseRow {
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

// =========================================================
// FUTEBOL DE BASE — Jogos + Financeiro (Fase 3, ver
// docs/superpowers/specs/2026-07-20-futebol-de-base-design.md). Espelham exatamente as
// interfaces acima, só acrescentando `categoria` em jogos_base (igual a atletas_base/
// comissao_tecnica_base) — o restante do universo de Jogos (checklist, convocação, logística,
// recibo, programação) não tem categoria própria, ela vem sempre do jogo. Credenciamento por
// zona e Carga de Ingressos ficam fora de escopo pro Futebol de Base.
// =========================================================

export interface JogoBaseRow {
  id: string;
  categoria: CategoriaBase;
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
  concentracao_data: string | null;
  concentracao_regras: string;
  dia_jogo_liberacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JogoProgramacaoItemBaseRow {
  id: string;
  jogo_id: string;
  tipo: ProgramacaoTipo;
  ordem: number;
  horario: string;
  atividade: string;
  local: string;
  eh_confronto: boolean;
  created_at: string;
}

export interface ChecklistJogoItemBaseRow {
  id: string;
  jogo_id: string;
  item: string;
  concluido: boolean;
  prazo: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ConvocacaoBaseRow {
  id: string;
  jogo_id: string;
  capitao_atleta_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConvocacaoAtletaBaseRow {
  convocacao_id: string;
  atleta_id: string;
  status: ConvocacaoAtletaStatus;
  /** Número da camisa NESSA convocação (jogo) — diferente de `atletas_base.numero_camisa`, que é
   * fixo por atleta. Na Base a numeração muda de jogo pra jogo, então é editada aqui mesmo, na
   * tela de Convocação, vindo sempre em branco (`null`) até alguém preencher. Ver
   * 0059_convocacao_atleta_base_numero_camisa.sql. Só Futebol de Base — `ConvocacaoAtletaRow`
   * (Profissional) não tem essa coluna, porque lá o número já é fixo no cadastro do atleta. */
  numero_camisa: number | null;
}

export interface ConvocacaoComissaoBaseRow {
  convocacao_id: string;
  comissao_id: string;
}

export interface ConvocacaoStaffBaseRow {
  convocacao_id: string;
  staff_id: string;
}

/** Espelha `SumulaRow`, mas para o Futebol de Base — tabela `sumulas_base`, `jogo_id` referencia
 * `jogos_base`. */
export interface SumulaBaseRow {
  id: string;
  jogo_id: string;
  duracao_primeiro_tempo: number;
  duracao_segundo_tempo: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Espelha `SumulaEventoRow`, mas para o Futebol de Base — tabela `sumula_eventos_base`, atletas
 * referenciam `atletas_base`. */
export interface SumulaEventoBaseRow {
  id: string;
  sumula_id: string;
  tipo: SumulaEventoTipo;
  tempo: SumulaTempo;
  minuto: number;
  atleta_id: string | null;
  atleta_entrou_id: string | null;
  atleta_assistencia_id: string | null;
  ordem: number;
  created_by: string | null;
  created_at: string;
}

export interface RoomingListBaseRow {
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

export interface RoomingListQuartoBaseRow {
  id: string;
  rooming_list_id: string;
  tipo: TipoQuarto;
  ordem: number;
  numero_apartamento: string | null;
}

export interface RoomingListOcupanteBaseRow {
  quarto_id: string;
  pessoa_tipo: PessoaTipoRooming;
  pessoa_id: string;
}

export interface OnibusListaBaseRow {
  id: string;
  jogo_id: string;
  onibus_numero: number;
  horario_saida: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OnibusPassageiroBaseRow {
  onibus_lista_id: string;
  pessoa_tipo: PessoaTipoOnibus;
  pessoa_id: string;
}

export interface ReciboJogoBaseRow {
  id: string;
  jogo_id: string;
  pessoa_tipo: PessoaTipoRecibo;
  pessoa_id: string;
  funcao_jogo: string | null;
  valor: number | null;
  chave_pix: string | null;
  chave_pix_tipo: StaffChavePixTipo | null;
  pago: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GastoJogoBaseRow {
  id: string;
  jogo_id: string;
  categoria_id: string;
  descricao: string | null;
  valor_previsto: number;
  valor_efetuado: number | null;
  data: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha de gastos_jogo_base já com a categoria embutida via join (`categoria:categorias_gasto(nome)`). */
export interface GastoJogoBaseComCategoriaRow extends GastoJogoBaseRow {
  categoria: { nome: string } | null;
}

/** Configurações do Financeiro (Base) — tabela singleton independente da do Profissional. */
export interface ConfiguracaoFinanceiroBaseRow {
  id: string;
  assinatura1_nome: string;
  assinatura1_cargo: string;
  assinatura2_nome: string;
  assinatura2_cargo: string;
  updated_at: string;
}

export type SolicitacaoTipo =
  | "compra"
  | "pagamento"
  | "exame_medico"
  | "reembolso"
  | "passagem_aerea"
  | "transporte"
  | "hospedagem";
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
  numero: number;
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
 * - Transporte: mesmas colunas de Passagem Aérea (passageiro/origem/destino/data_voo/horario_voo),
 *   mais valor — é um tipo de solicitação separado, mas reaproveita as colunas por terem o mesmo
 *   formato de campos.
 * - Hospedagem: passageiro + cidade + hotel + data_entrada + data_saida + tipo_acomodacao + valor
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
  cidade: string | null;
  hotel: string | null;
  data_entrada: string | null;
  data_saida: string | null;
  tipo_acomodacao: string | null;
  // Exclusivos de Exame Médico — origem/destino/data_voo/horario_voo (acima) são reaproveitados
  // pro trecho de IDA do transporte; estes cobrem o exame em si e o trecho de VOLTA.
  data_exame: string | null;
  local_exame: string | null;
  houve_transporte: boolean;
  origem_volta: string | null;
  destino_volta: string | null;
  data_volta: string | null;
  horario_volta: string | null;
  ordem: number;
  created_at: string;
}

/** "medico" é o valor gravado da ramificação hoje chamada de **Medicamentos** na interface — ver
 * ESTOQUE_CATEGORIAS em lib/validation/schemas.ts. */
export type EstoqueCategoria = "esportivo" | "medico" | "materiais";

/**
 * Item do catálogo de Estoque — Esportivo, Medicamentos e Materiais são listas totalmente independentes,
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
 * por categoria (cada ramificação com sua própria contagem 0001, 0002...).
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

/**
 * Futebol de Base — Estoque e Solicitações (Fase 4, ver a spec). Nenhum dos dois ganha a dimensão
 * `categoria` (Sub-20 a Sub-11): Solicitações já era uma lista única no Profissional, e o Estoque do
 * Base só tem material esportivo (Estoque Médico está fora de escopo), então nem existe uma coluna
 * `categoria` aqui — ao contrário de `EstoqueItemRow`, que tem três listas.
 */
export interface EstoqueItemBaseRow {
  id: string;
  nome: string;
  codigo: string | null;
  mg: string | null;
  tamanhos: Record<string, number>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstoqueSaidaBaseRow {
  id: string;
  numero: number;
  data: string;
  nome_destinatario: string;
  funcao: string | null;
  departamento: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EstoqueSaidaItemBaseRow {
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

export interface EstoqueEntradaBaseRow {
  id: string;
  numero: number;
  data: string;
  fornecedor: string | null;
  nota_fiscal: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EstoqueEntradaItemBaseRow {
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

export interface SolicitacaoBaseRow {
  id: string;
  numero: number;
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

export interface SolicitacaoItemBaseRow {
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
  cidade: string | null;
  hotel: string | null;
  data_entrada: string | null;
  data_saida: string | null;
  tipo_acomodacao: string | null;
  // Exclusivos de Exame Médico — origem/destino/data_voo/horario_voo (acima) são reaproveitados
  // pro trecho de IDA do transporte; estes cobrem o exame em si e o trecho de VOLTA.
  data_exame: string | null;
  local_exame: string | null;
  houve_transporte: boolean;
  origem_volta: string | null;
  destino_volta: string | null;
  data_volta: string | null;
  horario_volta: string | null;
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
  modulos_base_permitidos: string[];
  departamentos_permitidos: string[];
  tarefas_categorias_visiveis: string[];
  estoque_categorias_permitidas: string[];
  created_at: string;
}

// ===== Competições (ver docs/superpowers/specs/2026-08-10-competicoes-design.md) =====

export interface TemporadaRow {
  id: string;
  nome: string;
  created_by: string | null;
  created_at: string;
}

export type CompeticaoStatus = "planejada" | "em_andamento" | "encerrada";

/** A competição é identificada só pelo nome (sem "tipo", sem nome oficial à parte). As colunas
 * `regra_*` são o motor de regras disciplinares dela — cada campeonato pode ter regra própria. */
export interface CompeticaoRow {
  id: string;
  temporada_id: string;
  nome: string;
  federacao: string | null;
  categoria: string;
  data_inicio: string | null;
  data_termino: string | null;
  status: CompeticaoStatus;
  regulamento_path: string | null;
  observacoes: string | null;
  regra_amarelos_suspensao: number;
  regra_jogos_suspensao_amarelos: number;
  regra_jogos_suspensao_vermelho: number;
  /** Texto livre do regulamento que embasa as regras disciplinares (ex.: Art. 60 da Copa
   * Paulista) — só registro/consulta, o motor usa as colunas `regra_*` acima. */
  regra_observacoes: string | null;
  /** Critérios de desempate da competição, na ordem em que se aplicam (Art. 17 na Copa Paulista,
   * mas configurável — cada campeonato tem os seus). Ver lib/futebol/competicao-desempate.ts. */
  criterios_desempate: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompeticaoComTemporadaRow extends CompeticaoRow {
  temporada: Pick<TemporadaRow, "id" | "nome"> | null;
}

export type CompeticaoFaseStatus = "aguardando" | "em_andamento" | "encerrada";

export interface CompeticaoFaseRow {
  id: string;
  competicao_id: string;
  nome: string;
  ordem: number;
  status: CompeticaoFaseStatus;
  /** Regulamentos como o da Copa Paulista zeram os amarelos ao fim de certas fases ("desde que
   * não seja o terceiro da série"): com true, o acúmulo de amarelos não carrega pras fases
   * seguintes — suspensão já gerada dentro da fase continua valendo (ver
   * lib/futebol/competicao-disciplina.ts). */
  zerar_cartoes_ao_encerrar: boolean;
  /** Critérios de desempate próprios desta fase — null herda os da competição. É assim que o §1º
   * do Art. 17 da Copa Paulista é representado: no play in e no mata-mata valem só os critérios
   * "até a alínea b" (vitórias e saldo), na fase em questão. */
  criterios_desempate: string[] | null;
  created_at: string;
}

export interface CompeticaoGrupoRow {
  id: string;
  fase_id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

/** Equipe de um grupo: ou `nome` fixo, ou vaga projetada de fase anterior
 * (`origem_grupo_id` + `origem_posicao`, ex.: "1º do Grupo 3") resolvida pela classificação. */
export interface CompeticaoGrupoEquipeRow {
  id: string;
  grupo_id: string;
  nome: string | null;
  origem_grupo_id: string | null;
  origem_posicao: number | null;
  ordem: number;
  created_at: string;
}

/** Vínculo do jogo EXISTENTE (`public.jogos`) com competição/fase/grupo — o módulo de Competições
 * nunca cria jogo, só organiza os que já existem. */
export interface CompeticaoJogoRow {
  id: string;
  competicao_id: string;
  jogo_id: string;
  fase_id: string | null;
  grupo_id: string | null;
  /** Cartões do ADVERSÁRIO neste jogo do Juventus — a súmula do sistema só registra cartões dos
   * nossos atletas (que entram sozinhos na contagem da classificação), então o lado do adversário
   * é complementado à mão na aba Súmulas dos Grupos. */
  cartoes_amarelos_adversario: number;
  cartoes_vermelhos_adversario: number;
  /** Link do PDF da súmula oficial usado pra importar os cartões do adversário. */
  sumula_link: string | null;
  created_by: string | null;
  created_at: string;
}

/** Placar entre os OUTROS clubes do grupo (lançamento leve, só pra classificação) — jogos do
 * Juventus nunca entram aqui. */
export interface CompeticaoGrupoResultadoRow {
  id: string;
  grupo_id: string;
  equipe_casa: string;
  equipe_fora: string;
  gols_casa: number;
  gols_fora: number;
  data_jogo: string | null;
  /** Rodada do jogo (texto livre, ex.: "1ª rodada") — só organização da lista. */
  rodada: string | null;
  /** PDF da súmula do jogo anexado (bucket competicao-documentos), quando o Mateus quiser guardar
   * o comprovante do placar lançado. */
  sumula_path: string | null;
  /** Cartões de cada lado, lançados junto do placar — alimentam as colunas CA/CV da classificação
   * (mesmo formato da tabela oficial da FPF). */
  cartoes_amarelos_casa: number;
  cartoes_amarelos_fora: number;
  cartoes_vermelhos_casa: number;
  cartoes_vermelhos_fora: number;
  /** Link do PDF da súmula oficial de onde placar e cartões foram importados (quando veio de
   * link em vez de digitação). */
  sumula_link: string | null;
  created_by: string | null;
  created_at: string;
}

export type CompeticaoListaInscricao = "A" | "B";

export interface CompeticaoInscricaoRow {
  id: string;
  competicao_id: string;
  atleta_id: string;
  lista: CompeticaoListaInscricao | null;
  data_inscricao: string;
  created_by: string | null;
  created_at: string;
}

export type CompeticaoSuspensaoOrigem = "cartao" | "decisao_disciplinar" | "outro";

/** Só suspensão MANUAL (decisão disciplinar externa). As automáticas por cartão são derivadas
 * das súmulas pelo motor de regras (`lib/futebol/competicao-disciplina.ts`) — sem tabela. */
export interface CompeticaoSuspensaoManualRow {
  id: string;
  competicao_id: string;
  atleta_id: string;
  origem: CompeticaoSuspensaoOrigem;
  motivo: string;
  jogos_suspensao: number;
  data_decisao: string;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CompeticaoPrazoRow {
  id: string;
  competicao_id: string;
  titulo: string;
  data_inicio: string | null;
  data_fim: string;
  concluido: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CompeticaoDocumentoRow {
  id: string;
  competicao_id: string;
  nome: string;
  arquivo_path: string;
  created_by: string | null;
  created_at: string;
}

// ===== Termo de Responsabilidade — Retirada de Materiais =====
// Ver docs/superpowers/specs/2026-08-11-termos-retirada-design.md.

export type TermoRetiradaTipo = "emprestimo" | "definitiva";

/** Documento assinado no ato da retirada de material do clube. Diferente de `estoque_saidas`
 * (catálogo do Estoque, com baixa de quantidade): aqui os itens são digitados livremente. */
export interface TermoRetiradaRow {
  id: string;
  numero: number;
  data: string;
  tipo: TermoRetiradaTipo;
  responsavel_nome: string;
  responsavel_documento: string | null;
  funcao: string | null;
  departamento: string | null;
  finalidade: string | null;
  /** Só faz sentido em empréstimo. */
  previsao_devolucao: string | null;
  /** Texto efetivamente assinado — gravado no termo pra o PDF de um documento antigo não mudar
   * quando o texto padrão do sistema for ajustado. */
  texto_responsabilidade: string;
  observacoes: string | null;
  devolvido_em: string | null;
  devolucao_observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TermoRetiradaItemRow {
  id: string;
  termo_id: string;
  descricao: string;
  quantidade: number;
  /** "Valor sugerido" do item — opcional; sustenta o trecho de ressarcimento do termo. */
  valor_unitario: number | null;
  ordem: number;
  created_at: string;
}

/** Tipo do anexo do termo: o documento assinado da retirada, o comprovante assinado da devolução,
 * ou qualquer outro arquivo de apoio (foto do material, nota fiscal). */
export type TermoRetiradaAnexoTipo = "assinado" | "devolucao" | "outro";

export interface TermoRetiradaAnexoRow {
  id: string;
  termo_id: string;
  tipo: TermoRetiradaAnexoTipo;
  nome: string;
  arquivo_path: string;
  created_by: string | null;
  created_at: string;
}

// ===== Hotéis (cadastro reutilizável — ver supabase/migrations/0070_hoteis.sql) =====

export interface HotelRow {
  id: string;
  nome: string;
  cnpj: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  /** Pessoa de contato no hotel (comercial/eventos) — é com quem a reserva é fechada. */
  contato_nome: string | null;
  contato_funcao: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  diaria_referencia: number | null;
  cafe_incluso: boolean;
  estacionamento_onibus: boolean;
  sala_refeicao_grupo: boolean;
  horario_checkin: string | null;
  horario_checkout: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Veículos / Placas (ver supabase/migrations/0071_veiculos.sql) =====

/** Mesmos três grupos de pessoa do rooming list — o vínculo é opcional (condutor pode ser
 * terceirizado, familiar, dirigente convidado). */
export type VeiculoPessoaTipo = "atleta" | "comissao" | "staff";

export interface VeiculoRow {
  id: string;
  /** Condutor/responsável — é o nome impresso no ofício de liberação de acesso. */
  nome: string;
  documento: string | null;
  placa: string;
  modelo: string | null;
  marca: string | null;
  cor: string | null;
  ano: number | null;
  pessoa_tipo: VeiculoPessoaTipo | null;
  pessoa_id: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
