/**
 * Validação e formatação de CPF (Cadastro de Pessoa Física).
 * Sem dependências externas — algoritmo padrão de dígito verificador.
 * Usado tanto no client (feedback instantâneo no formulário) quanto no
 * server (Server Action, nunca confiando só na validação do client).
 */

/** Remove tudo que não for dígito. */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida um CPF pelo algoritmo de dígito verificador.
 * Rejeita CPFs com todos os dígitos iguais (ex: 00000000000),
 * que passariam na conta mas nunca são válidos.
 */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const calcCheckDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const firstCheckDigit = calcCheckDigit(9);
  if (firstCheckDigit !== digits[9]) return false;

  const secondCheckDigit = calcCheckDigit(10);
  if (secondCheckDigit !== digits[10]) return false;

  return true;
}

/** Formata um CPF (11 dígitos) como "000.000.000-00". Retorna o valor original se não tiver 11 dígitos. */
export function formatCPF(value: string): string {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return value;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/** Normaliza um CPF para armazenamento: só os 11 dígitos, sem máscara. */
export function normalizeCPF(value: string): string {
  return onlyDigits(value);
}
