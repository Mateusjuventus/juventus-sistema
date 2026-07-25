/**
 * Padronização de nomes próprios (nome completo) — deixa o cadastro consistente independentemente
 * de o usuário digitar tudo em maiúsculas, tudo em minúsculas ou misturado (comum em cadastros em
 * lote ou copiados de outro sistema). Ex.: "MATEUS DOS SANTOS PEREIRA" ou "mateus dos santos
 * pereira" viram "Mateus dos Santos Pereira".
 *
 * Preposições/conectivos comuns em nomes em português ficam em minúsculo quando não são a
 * primeira palavra (dos, das, do, da, e) — sem essa exceção "Mateus Dos Santos" ficaria estranho.
 */

const CONECTIVOS = new Set(["da", "das", "de", "do", "dos", "e"]);

function capitalizarPalavra(palavra: string): string {
  if (!palavra) return palavra;
  // Nomes compostos com hífen (ex.: "Jean-Pierre") — cada parte capitalizada.
  return palavra
    .split("-")
    .map((parte) => {
      const minuscula = parte.toLocaleLowerCase("pt-BR");
      return minuscula.charAt(0).toLocaleUpperCase("pt-BR") + minuscula.slice(1);
    })
    .join("-");
}

/** Normaliza um nome próprio para o padrão "Primeira Letra Maiúscula", com conectivos em
 * minúsculo quando não estão no início. Espaços duplicados/nas pontas são removidos. */
export function normalizarNomeProprio(nome: string): string {
  const palavras = nome.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

  return palavras
    .map((palavra, index) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (index > 0 && CONECTIVOS.has(minuscula)) return minuscula;
      return capitalizarPalavra(palavra);
    })
    .join(" ");
}
