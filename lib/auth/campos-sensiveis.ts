/**
 * Catálogo de "campos sensíveis" que podem ser escondidos, pessoa por pessoa, mesmo de quem tem
 * o módulo liberado — ver docs/superpowers/specs/2026-10-02-campos-sensiveis-e-atletas-por-
 * categoria-design.md. Nasce com uma única entrada (Salário), por pedido explícito do Mateus
 * ("só salário por enquanto"), mas o mecanismo (coluna `campos_sensiveis_bloqueados` em `perfis`,
 * checkbox em `/usuarios`, leitura em `lib/auth/role.ts`) é genérico sobre esta lista — crescer o
 * catálogo no futuro é só acrescentar uma entrada aqui, nenhum dos outros arquivos menciona
 * "salário" pelo nome.
 */
export type CampoSensivel = "salario";

export interface CampoSensivelInfo {
  value: CampoSensivel;
  label: string;
}

export const CAMPOS_SENSIVEIS: CampoSensivelInfo[] = [{ value: "salario", label: "Salário" }];

export const TODOS_CAMPOS_SENSIVEIS: CampoSensivel[] = CAMPOS_SENSIVEIS.map((c) => c.value);

export function ehCampoSensivelValido(valor: string): valor is CampoSensivel {
  return (TODOS_CAMPOS_SENSIVEIS as string[]).includes(valor);
}
