/**
 * Configuração de um clube atendido pela Proxis. Cada clube roda numa instância própria
 * (projeto Vercel + projeto Supabase); qual clube é a instância vem de NEXT_PUBLIC_CLUBE, lido no
 * build. Ver docs/superpowers/specs/2026-11-22-configuracao-por-clube-design.md.
 */
export type ClubeId = "juventus" | "maringa";

export interface ClubeCores {
  /** Áreas grandes (sidebar, marcas fortes) e texto de destaque. Nome legado do Juventus. */
  grena: string;
  /** Hover e texto/acento pequeno — nunca preenchimento de área grande. */
  grenaEscuro: string;
  /** Acento pontual: item ativo, foco, botão de destaque. Nome legado do Juventus. */
  dourado: string;
  /** Acento em documentos e pôsteres (PDF/imagem) — no Juventus, um dourado mais claro que o da tela. */
  acentoDocumento: string;
  /** Fundo da página. */
  cinzaPagina: string;
  /** Bordas e filetes. */
  linha: string;
  /** Barras "de referência" em gráficos. */
  contexto: string;
  /** Cinza de gráfico ("não convocado"). */
  prata: string;
  branco: string;
}

export interface ClubeConfig {
  id: ClubeId;
  /** Nome em telas, confrontos ("Juventus x Adversário") e nomes de arquivo. */
  nomeCurto: string;
  /** Nome por extenso: login, documentos de liberação ("Clube Atlético Juventus"). */
  nomeCompleto: string;
  /** Nome oficial com a forma jurídica: cabeçalho das páginas públicas, rodapé ("… SAF"). */
  nomeOficial: string;
  /** Nome abreviado em títulos de documento ("CA Juventus SAF Sub-17"). */
  nomeDocumento: string;
  /** Nome institucional curto em cabeçalhos de painel e notificações ("Juventus SAF"). */
  nomeInstitucional: string;
  /** Nome no topo dos formulários públicos e do menu ("Juventus - SAF"). */
  nomeCabecalho: string;
  /** Razão social completa: rodapé de documentos, recibos, termos. */
  razaoSocial: string;
  /** Forma em caixa alta usada em assinaturas de documento. */
  razaoSocialAssinatura: string;
  /** CNPJ formatado. Enquanto o clube não informar, um marcador visível entre colchetes. */
  cnpj: string;
  /** Endereço da sede, uma linha. */
  endereco: string;
  /** Cidade usada no fechamento de documentos ("São Paulo – SP, 22 de novembro de 2026"). */
  cidadeAssinatura: string;
  /** Local padrão sugerido para atividades (ex.: centro de treinamento). */
  localPadrao: string;
  /** Slug usado em nomes de arquivo exportado ("rooming-list-juventus-x-…"). */
  slug: string;
  slogan?: string;
  /** Caminhos dentro de public/ — servem para a tela e para os PDFs. */
  /**
   * `completo`/`mark` para fundo claro; `completoSobreEscuro`/`markSobreEscuro` para fundo escuro
   * (sidebar, cabeçalhos cheios). No Juventus o brasão colorido serve nos dois.
   */
  escudo: { completo: string; mark: string; completoSobreEscuro: string; markSobreEscuro: string; alt: string };
  cores: ClubeCores;
  /** Uma cor por categoria da base (gráficos, etiquetas), do mais velho ao mais novo. */
  coresCategoriaBase: { sub20: string; sub17: string; sub15: string; sub14: string; sub13: string; sub12: string; sub11: string };
  fonte: {
    /** Família CSS do texto corrido. */
    texto: string;
    /** Família CSS de títulos (classe font-display). */
    display: string;
  };
  modulos: {
    /** Futebol Profissional. */
    profissional: boolean;
    /** Súmula e integração com a Federação Paulista de Futebol. */
    fpf: boolean;
    /** Modelos de contrato com texto jurídico e signatários próprios do clube. */
    contratoFormacao: boolean;
  };
  /** Trecho do nome do clube usado para identificá-lo na súmula da federação. */
  nomeBuscaFederacao: string;
}
