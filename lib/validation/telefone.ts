/**
 * Máscara de telefone: formata em tempo real enquanto a pessoa digita, crescendo de
 * "(00) 0000-0000" pra "(00) 00000-0000" assim que o 11º dígito é digitado — mesma lógica de
 * "vai crescendo a máscara" de qualquer app de banco. Sem dependências externas, mesmo estilo de
 * `lib/validation/cpf.ts` (onlyDigits/formatXxx/normalizeXxx).
 */

/** Remove tudo que não for dígito. */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata um telefone (DDD + número) enquanto a pessoa digita: até 10 dígitos vira
 * "(00) 0000-0000" (fixo), 11 dígitos vira "(00) 00000-0000" (celular). Aceita qualquer
 * quantidade de dígitos digitados (não só 10 ou 11) — usado tanto no campo com máscara em tempo
 * real (`TelefoneField`) quanto pra exibir um valor já salvo.
 */
export function formatTelefone(value: string): string {
  const digitos = onlyDigits(value).slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/** Normaliza um telefone para armazenamento: só os dígitos, sem máscara (até 11). */
export function normalizeTelefone(value: string): string {
  return onlyDigits(value).slice(0, 11);
}

/** Um telefone válido tem DDD + fixo (10 dígitos) ou DDD + celular (11 dígitos). */
export function isValidTelefone(value: string): boolean {
  const digitos = onlyDigits(value);
  return digitos.length === 10 || digitos.length === 11;
}
