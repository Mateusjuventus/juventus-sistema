/**
 * Regras puras do cadastro de Hotéis — montagem de endereço e rótulos. Sem Supabase e sem React,
 * pra poder testar direto (lib/futebol/hotel.test.ts).
 */

export interface HotelEndereco {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
}

function limpo(valor: string | null | undefined): string {
  return (valor ?? "").trim();
}

/**
 * Endereço em uma linha, no formato que se escreve em documento:
 * "Rua Javari, 117 — Mooca, São Paulo/SP, CEP 03112-100".
 * Parte que não foi preenchida some da linha (nada de vírgula solta nem "undefined").
 */
export function enderecoCompleto(hotel: HotelEndereco): string {
  const rua = [limpo(hotel.logradouro), limpo(hotel.numero)].filter(Boolean).join(", ");
  const ruaComComplemento = [rua, limpo(hotel.complemento)].filter(Boolean).join(" — ");
  const cidadeUfTexto = cidadeUf(hotel);
  const cep = limpo(hotel.cep) ? `CEP ${limpo(hotel.cep)}` : "";

  return [ruaComComplemento, limpo(hotel.bairro), cidadeUfTexto, cep].filter(Boolean).join(", ");
}

/** "São Paulo/SP", ou só a cidade quando não há UF (e vice-versa). */
export function cidadeUf(hotel: Pick<HotelEndereco, "cidade" | "uf">): string {
  const cidade = limpo(hotel.cidade);
  const uf = limpo(hotel.uf).toUpperCase();
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf;
}

export interface HotelEstrutura {
  cafe_incluso: boolean;
  estacionamento_onibus: boolean;
  sala_refeicao_grupo: boolean;
}

export const ESTRUTURA_LABEL: Record<keyof HotelEstrutura, string> = {
  cafe_incluso: "Café da manhã incluso",
  estacionamento_onibus: "Estacionamento para ônibus",
  sala_refeicao_grupo: "Sala para refeição/preleção do grupo",
};

/** Só o que o hotel TEM — a lista serve de etiqueta na tela, então marcar o que falta seria ruído. */
export function estruturaDoHotel(hotel: HotelEstrutura): string[] {
  return (Object.keys(ESTRUTURA_LABEL) as (keyof HotelEstrutura)[])
    .filter((chave) => hotel[chave])
    .map((chave) => ESTRUTURA_LABEL[chave]);
}

export function formatDiaria(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
