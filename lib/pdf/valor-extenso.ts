/**
 * Converte um valor em reais para texto por extenso (ex: 250 -> "duzentos e cinquenta reais"),
 * usado no recibo de pagamento pra reforçar o valor escrito em número — prática comum em recibos
 * formais no Brasil. Cobre valores de R$ 0,00 até R$ 999.999.999,99, que é bem mais do que qualquer
 * pagamento de jogo deste sistema deve precisar.
 */

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function dezenaExtenso(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DEZ_A_DEZENOVE[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d];
}

function trioExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena]);
  if (resto > 0) partes.push(dezenaExtenso(resto));
  return partes.join(" e ");
}

function numeroExtenso(n: number): string {
  if (n === 0) return "zero";

  const milhoes = Math.floor(n / 1_000_000);
  const restoAposMilhoes = n % 1_000_000;
  const milhares = Math.floor(restoAposMilhoes / 1000);
  const unidades = restoAposMilhoes % 1000;

  const grupos: string[] = [];
  if (milhoes > 0) grupos.push(milhoes === 1 ? "um milhão" : `${trioExtenso(milhoes)} milhões`);
  if (milhares > 0) grupos.push(milhares === 1 ? "mil" : `${trioExtenso(milhares)} mil`);
  if (unidades > 0) grupos.push(trioExtenso(unidades));

  if (grupos.length === 1) return grupos[0];

  const ultimo = grupos[grupos.length - 1];
  const anteriores = grupos.slice(0, -1);
  const usarE = unidades > 0 && unidades < 100;
  return `${anteriores.join(", ")}${usarE ? " e " : ", "}${ultimo}`;
}

export function valorPorExtenso(valor: number): string {
  const inteiro = Math.floor(valor + 1e-9);
  const centavos = Math.round((valor - inteiro) * 100);

  const parteReais = inteiro > 0 ? `${numeroExtenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}` : "";
  const parteCentavos = centavos > 0 ? `${numeroExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";

  if (parteReais && parteCentavos) return `${parteReais} e ${parteCentavos}`;
  if (parteReais) return parteReais;
  if (parteCentavos) return parteCentavos;
  return "zero reais";
}
