/**
 * Data de "hoje" sempre no horário de Brasília, independente do fuso horário do servidor onde o
 * código roda (na Vercel isso é UTC) — mesma classe de bug já corrigida em `formatCarimbo`
 * (lib/pdf/logistica-shared.tsx): perto da meia-noite, `new Date().toISOString().slice(0, 10)`
 * pode devolver o dia seguinte (ou anterior) ao dia real em São Paulo. Usado por
 * `duplicarSolicitacao`/`duplicarSolicitacaoBase` pra preencher a data da cópia com "hoje" de
 * verdade.
 */
export function hojeBrasilia(): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}
