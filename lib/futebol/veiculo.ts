/**
 * Regras puras do cadastro de Veículos / Placas. Sem Supabase e sem React (ver
 * lib/futebol/veiculo.test.ts).
 */

export type VeiculoPessoaTipo = "atleta" | "comissao" | "staff";

export const PESSOA_TIPO_LABEL: Record<VeiculoPessoaTipo, string> = {
  atleta: "Atleta",
  comissao: "Comissão Técnica",
  staff: "Staff Operacional",
};

/** Tira tudo que não é letra/número e joga pra maiúscula — é assim que a placa é comparada e
 * guardada, pra "abc-1234", "ABC1234" e "abc 1234" não virarem três cadastros diferentes. */
export function normalizarPlaca(placa: string): string {
  return placa
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Formato de exibição. Duas convenções convivem no Brasil e as duas precisam sair legíveis:
 *  - antiga, 3 letras + 4 números: ABC-1234
 *  - Mercosul, 3 letras + número + letra + 2 números: ABC1D23 (não leva hífen)
 * Placa que não bate com nenhum dos dois volta como foi digitada (em maiúsculas) — o cadastro não
 * deve travar por causa de placa estrangeira ou de veículo especial.
 */
export function formatPlaca(placa: string): string {
  const limpa = normalizarPlaca(placa);
  if (/^[A-Z]{3}\d{4}$/.test(limpa)) return `${limpa.slice(0, 3)}-${limpa.slice(3)}`;
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpa)) return limpa;
  return placa.trim().toUpperCase();
}

/** Reconhece os dois padrões oficiais. Usado só pra AVISAR no formulário, nunca pra bloquear. */
export function placaReconhecida(placa: string): boolean {
  const limpa = normalizarPlaca(placa);
  return /^[A-Z]{3}\d{4}$/.test(limpa) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpa);
}

export interface VeiculoDescricao {
  marca?: string | null;
  modelo?: string | null;
  cor?: string | null;
  ano?: number | null;
}

/** "Fiat Argo prata (2021)" — junta só o que existe, sem parêntese vazio nem espaço duplo. */
export function descricaoVeiculo(veiculo: VeiculoDescricao): string {
  const partes = [veiculo.marca, veiculo.modelo, veiculo.cor]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  const base = partes.join(" ");
  const ano = veiculo.ano ? `(${veiculo.ano})` : "";
  return [base, ano].filter(Boolean).join(" ") || "—";
}

/** Chave usada nas telas pra ligar um veículo à pessoa selecionada ("atleta:uuid"). */
export function chavePessoa(tipo: VeiculoPessoaTipo, id: string): string {
  return `${tipo}:${id}`;
}

export function lerChavePessoa(chave: string): { tipo: VeiculoPessoaTipo; id: string } | null {
  const [tipo, id] = chave.split(":");
  if (!id) return null;
  if (tipo !== "atleta" && tipo !== "comissao" && tipo !== "staff") return null;
  return { tipo, id };
}

/** Ordena a relação de placas pelo nome do condutor (é como a portaria confere a lista). */
export function ordenarPorCondutor<T extends { nome: string }>(veiculos: T[]): T[] {
  return [...veiculos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
