/**
 * Máscara e validação de Chave PIX conforme o tipo escolhido — usado tanto no client (formatar
 * enquanto digita, ver components/chave-pix-field.tsx) quanto no server (bloquear envio se a chave
 * estiver incompleta pro tipo, ver chavePixValida abaixo e os `.refine` que a usam em schemas.ts).
 * Mantido em arquivo próprio (em vez de dentro de schemas.ts) por ser usado também em componentes
 * client, que não devem importar o resto de schemas.ts (validado só no server).
 */

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function mascararCpf(valorDigitado: string): string {
  const d = apenasDigitos(valorDigitado).slice(0, 11);
  const partes = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)];
  let resultado = partes[0];
  if (partes[1]) resultado += `.${partes[1]}`;
  if (partes[2]) resultado += `.${partes[2]}`;
  if (partes[3]) resultado += `-${partes[3]}`;
  return resultado;
}

function mascararCnpj(valorDigitado: string): string {
  const d = apenasDigitos(valorDigitado).slice(0, 14);
  const partes = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let resultado = partes[0];
  if (partes[1]) resultado += `.${partes[1]}`;
  if (partes[2]) resultado += `.${partes[2]}`;
  if (partes[3]) resultado += `/${partes[3]}`;
  if (partes[4]) resultado += `-${partes[4]}`;
  return resultado;
}

/** Celular (11 dígitos, DDD + 9) ou fixo (10 dígitos, DDD + 8) — decide o formato pelo que já foi
 * digitado até agora. */
function mascararTelefone(valorDigitado: string): string {
  const d = apenasDigitos(valorDigitado).slice(0, 11);
  if (d.length === 0) return "";
  const ddd = d.slice(0, 2);
  if (d.length <= 2) return `(${ddd}`;

  const resto = d.slice(2);
  const tamanhoNumero = d.length > 10 ? 5 : 4; // 11 dígitos totais = celular (5+4); senão fixo (4+4)
  const numeroParte1 = resto.slice(0, tamanhoNumero);
  const numeroParte2 = resto.slice(tamanhoNumero);
  return numeroParte2 ? `(${ddd}) ${numeroParte1}-${numeroParte2}` : `(${ddd}) ${numeroParte1}`;
}

/** Formata `valor` (o texto já digitado, com ou sem máscara) conforme `tipo` — chamado a cada
 * keystroke em components/chave-pix-field.tsx. E-mail, chave aleatória ou nenhum tipo selecionado:
 * sem máscara, o texto passa direto. */
export function formatarChavePix(valor: string, tipo: string | undefined): string {
  switch (tipo) {
    case "cpf":
      return mascararCpf(valor);
    case "cnpj":
      return mascararCnpj(valor);
    case "telefone":
      return mascararTelefone(valor);
    default:
      return valor;
  }
}

/** Placeholder mostrado no campo, conforme o tipo selecionado — só cosmético. */
export function placeholderChavePix(tipo: string | undefined): string | undefined {
  switch (tipo) {
    case "cpf":
      return "000.000.000-00";
    case "cnpj":
      return "00.000.000/0000-00";
    case "telefone":
      return "(00) 00000-0000";
    case "email":
      return "nome@exemplo.com";
    default:
      return undefined;
  }
}

/**
 * Valida se `valor` está completo pro `tipo` de chave selecionado — usado nos `.refine` dos schemas
 * (bloqueia salvar com chave incompleta). Chave vazia é sempre válida aqui: a obrigatoriedade de
 * preencher (ou não) a chave é responsabilidade de outro campo/refine, este só valida o FORMATO
 * quando algo foi preenchido.
 */
export function chavePixValida(valor: string | undefined | null, tipo: string | undefined | null): boolean {
  const texto = (valor ?? "").trim();
  if (!texto) return true;

  switch (tipo) {
    case "cpf":
      return apenasDigitos(texto).length === 11;
    case "cnpj":
      return apenasDigitos(texto).length === 14;
    case "telefone": {
      const digitos = apenasDigitos(texto).length;
      return digitos === 10 || digitos === 11;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
    default:
      // "aleatoria" ou nenhum tipo selecionado: chave aleatória não tem formato fixo, não valida.
      return true;
  }
}
