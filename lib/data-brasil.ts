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

/**
 * Formata um timestamp (ISO, como vem de `created_at` do Supabase — sempre em UTC) como
 * "dd/mm/aaaa às HH:mm" no horário de Brasília — mesma classe de bug já corrigida em
 * `formatCarimbo` (lib/pdf/logistica-shared.tsx): antes, as telas de Vagas de Staff
 * (`app/jogos/[id]/vagas` e `app/base/jogos/[id]/vagas`) tinham cada uma sua própria versão dessa
 * função, que só fatiava os dígitos do texto ISO na marra (`iso.split("T")`) sem nenhuma conversão
 * de fuso — mostrava a hora em UTC como se já fosse a hora local, 3h adiantada pra quem está no
 * Brasil (bug relatado pelo Mateus: "Pegou em 17:19" pra quem pegou a vaga às 14:19 de verdade).
 * `Intl.DateTimeFormat` com `timeZone` fixo resolve isso de vez, não importa o fuso do servidor.
 */
export function formatDataHoraBrasilia(iso: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  // Algumas versões do ICU devolvem "24" em vez de "00" pra meia-noite mesmo com hour12: false.
  const hora = partes.hour === "24" ? "00" : partes.hour;
  return `${partes.day}/${partes.month}/${partes.year} às ${hora}:${partes.minute}`;
}
