/**
 * Catálogo dos departamentos que podem ser liberados/bloqueados por usuário "regular" (quem é
 * "master" sempre tem os dois — ver `lib/auth/role.ts` e `lib/supabase/middleware.ts`). É uma
 * camada acima dos módulos (`lib/auth/modulos.ts`): hoje todos os 7 módulos existentes pertencem
 * ao Futebol Profissional, então quem não tem "futebol_profissional" aqui não acessa nenhum deles,
 * independente do que estiver marcado em `modulos_permitidos`.
 *
 * "futebol_base" ainda não tem módulos próprios (a tela `/base` é só um placeholder "em breve"),
 * mas a permissão já existe pra quando esse departamento for construído.
 */
export type DepartamentoChave = "futebol_profissional" | "futebol_base";

export interface DepartamentoInfo {
  chave: DepartamentoChave;
  label: string;
  prefixo: string;
}

export const DEPARTAMENTOS: DepartamentoInfo[] = [
  { chave: "futebol_profissional", label: "Futebol Profissional", prefixo: "/profissional" },
  { chave: "futebol_base", label: "Futebol de Base", prefixo: "/base" },
];

export const TODOS_DEPARTAMENTOS: DepartamentoChave[] = DEPARTAMENTOS.map((d) => d.chave);

export function ehDepartamentoValido(valor: string): valor is DepartamentoChave {
  return (TODOS_DEPARTAMENTOS as string[]).includes(valor);
}
