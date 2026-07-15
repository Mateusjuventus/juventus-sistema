import * as XLSX from "xlsx";

/**
 * Gera um arquivo .xlsx (Excel) a partir de uma ou mais listas de linhas e devolve como resposta
 * de download. Usado só para GERAR planilhas a partir dos dados do sistema (nunca para LER
 * arquivos enviados por alguém) — não existe nenhum upload/parse de .xlsx no sistema.
 */
export function buildXlsxResponse(
  filename: string,
  sheets: { nome: string; linhas: Record<string, string | number>[] }[],
): Response {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.linhas);
    // Nome da aba no Excel tem limite de 31 caracteres e não aceita alguns símbolos.
    const nomeAba = sheet.nome.slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
