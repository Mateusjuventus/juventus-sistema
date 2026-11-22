import type { ClubeConfig, ClubeId } from "./tipos";

export const juventus: ClubeConfig = {
  id: "juventus",
  nomeCurto: "Juventus",
  nomeCompleto: "Clube Atlético Juventus",
  nomeOficial: "Clube Atlético Juventus SAF",
  nomeDocumento: "CA Juventus SAF",
  nomeInstitucional: "Juventus SAF",
  nomeCabecalho: "Juventus - SAF",
  razaoSocial: "Juventus Sociedade Anônima do Futebol",
  razaoSocialAssinatura: "JUVENTUS SAF",
  cnpj: "63.634.319/0001-99",
  endereco: "Rua Javari, 117 – Mooca, São Paulo – SP, 03112-100",
  cidadeAssinatura: "São Paulo – SP",
  localPadrao: "CT Juventus",
  slug: "juventus",
  escudo: {
    completo: "/brand/juventus-escudo.png",
    mark: "/brand/juventus-escudo-mark.png",
    completoSobreEscuro: "/brand/juventus-escudo.png",
    markSobreEscuro: "/brand/juventus-escudo-mark.png",
    alt: "Brasão do Juventus",
  },
  // Paleta validada no redesign de 07/08/2026 (docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md).
  cores: {
    grena: "#5C0A35",
    grenaEscuro: "#3F0724",
    dourado: "#B98F1E",
    acentoDocumento: "#C9A227",
    cinzaPagina: "#EEF0F2",
    linha: "#E3E5E8",
    contexto: "#C7C9CD",
    prata: "#B0B0B0",
    branco: "#FFFFFF",
  },
  // Degradê do próprio grená, do Sub-20 (mais escuro) ao Sub-11 (mais claro).
  coresCategoriaBase: {
    sub20: "#3F0724",
    sub17: "#5C0A35",
    sub15: "#732D52",
    sub14: "#8B516F",
    sub13: "#A2748C",
    sub12: "#BA97A9",
    sub11: "#D1BAC6",
  },
  fonte: {
    texto: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    display: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  modulos: { profissional: true, fpf: true, contratoFormacao: true },
  nomeBuscaFederacao: "juventus",
};

export const maringa: ClubeConfig = {
  id: "maringa",
  nomeCurto: "Maringá FC",
  nomeCompleto: "Maringá Futebol Clube",
  nomeOficial: "Maringá Futebol Clube",
  nomeDocumento: "Maringá FC",
  nomeInstitucional: "Maringá FC",
  nomeCabecalho: "Maringá FC",
  razaoSocial: "Maringá Futebol Clube",
  razaoSocialAssinatura: "MARINGÁ FUTEBOL CLUBE",
  // Ainda não informados pelo clube: aparecem assim nos documentos até serem preenchidos.
  cnpj: "[CNPJ]",
  endereco: "[Endereço] – Maringá – PR",
  cidadeAssinatura: "Maringá – PR",
  localPadrao: "",
  slug: "maringa-fc",
  slogan: "Mais que um time, uma cidade",
  escudo: {
    completo: "/brand/maringa-escudo.png",
    mark: "/brand/maringa-escudo-mark.png",
    // Verde do escudo some sobre o verde-profundo: em fundo escuro entra a versão branca oficial.
    completoSobreEscuro: "/brand/maringa-escudo-branco.png",
    markSobreEscuro: "/brand/maringa-escudo-mark-branco.png",
    alt: "Escudo do Maringá FC",
  },
  // Design system "Maringá FC" (skill documento-maringa-fc). Mapeamento nos nomes legados de token:
  // grena = verde-profundo, dourado = verde do escudo. Ver a spec de configuração por clube.
  cores: {
    grena: "#12514A",
    grenaEscuro: "#0D3F39",
    dourado: "#00A75D",
    acentoDocumento: "#00A75D",
    cinzaPagina: "#F2F4F1",
    linha: "#E0E0E0",
    contexto: "#C0C8B0",
    prata: "#7C837F",
    branco: "#FFFFFF",
  },
  // Cores fixas por categoria do padrão do clube (Mapa do Futebol de Base): Sub-20 verde-profundo,
  // Sub-17 verde do escudo, Sub-15 oliva, Iniciação nos tons claros da paleta.
  coresCategoriaBase: {
    sub20: "#12514A",
    sub17: "#00A75D",
    sub15: "#628252",
    sub14: "#779889",
    sub13: "#AECC53",
    sub12: "#C0C8B0",
    sub11: "#7C837F",
  },
  fonte: {
    texto: '"Montserrat Variable", Arial, system-ui, sans-serif',
    display: '"Saira Condensed", "Arial Narrow", "Montserrat Variable", sans-serif',
  },
  modulos: { profissional: false, fpf: false, contratoFormacao: false },
  nomeBuscaFederacao: "maring",
};

export const CLUBES: Record<ClubeId, ClubeConfig> = { juventus, maringa };
