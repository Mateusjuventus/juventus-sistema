/**
 * Tipos das linhas das tabelas do Supabase, espelhando
 * supabase/migrations/0001_init.sql. Mantidos manualmente por enquanto;
 * podem ser substituídos por `supabase gen types typescript` no futuro.
 */

export type PeDominante = "destro" | "canhoto" | "ambidestro";

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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffOperacionalRow {
  id: string;
  nome_completo: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  funcao_setor: string;
  telefone: string | null;
  chave_pix: string | null;
  valor_padrao_pagamento: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
