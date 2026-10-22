/**
 * Formatação de CEP — mesmo estilo de `lib/validation/cpf.ts`/`lib/validation/telefone.ts`
 * (onlyDigits/formatXxx/normalizeXxx), sem dependências externas.
 *
 * Pedido do Mateus em 2026-10-22 ("cep a mesma situação", logo depois de pedir o mesmo pro
 * telefone): vários cadastros antigos têm o CEP salvo só com os 8 dígitos, sem o traço
 * ("07031000" em vez de "07031-000"), e aparecia assim cru nas telas — agora qualquer tela que
 * mostra o CEP de um cadastro formata com `formatCEP`, que aceita os dois jeitos (com ou sem
 * traço) e sempre devolve no formato "00000-000".
 */

/** Remove tudo que não for dígito. */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata um CEP (8 dígitos) como "00000-000". Retorna o valor original se não tiver 8 dígitos
 * (por exemplo, um cadastro antigo com CEP incompleto — melhor mostrar o que tem do que escondê-lo). */
export function formatCEP(value: string): string {
  const cep = onlyDigits(value);
  if (cep.length !== 8) return value;
  return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/** Normaliza um CEP para armazenamento: só os 8 dígitos, sem traço. */
export function normalizeCEP(value: string): string {
  return onlyDigits(value).slice(0, 8);
}

/** Um CEP válido tem exatamente 8 dígitos. */
export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8;
}
