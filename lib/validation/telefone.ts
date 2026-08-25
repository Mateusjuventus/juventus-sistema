/**
 * Máscara de telefone: formata em tempo real enquanto a pessoa digita, sempre no molde de celular
 * "(00) 00000-0000" — pedido do Mateus em 25/08 (ver docs/superpowers/specs/
 * 2026-08-25-atleta-telefone-alergia-foto-design.md): "ajustar o telefone (DD) 00000-0000 sempre
 * nesse formato". Até então crescia de "(00) 0000-0000" (fixo, 10 dígitos) pra esse formato; agora
 * é sempre o de celular, sem aceitar mais o de fixo. Sem dependências externas, mesmo estilo de
 * `lib/validation/cpf.ts` (onlyDigits/formatXxx/normalizeXxx).
 */

/** Remove tudo que não for dígito. */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata um telefone (DDD + celular) enquanto a pessoa digita, sempre no molde
 * "(00) 00000-0000" — aceita qualquer quantidade de dígitos digitados até 11 (não só o total),
 * usado tanto no campo com máscara em tempo real (`TelefoneField`) quanto pra exibir um valor já
 * salvo.
 */
export function formatTelefone(value: string): string {
  const digitos = onlyDigits(value).slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/** Normaliza um telefone para armazenamento: só os dígitos, sem máscara (até 11). */
export function normalizeTelefone(value: string): string {
  return onlyDigits(value).slice(0, 11);
}

/** Um telefone válido tem DDD + celular: exatamente 11 dígitos. */
export function isValidTelefone(value: string): boolean {
  return onlyDigits(value).length === 11;
}
