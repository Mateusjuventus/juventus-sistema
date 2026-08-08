import type { AtletaRow, EventoCalendarioCategoria, EventoCalendarioRow, JogoRow } from "@/lib/supabase/types";

/** Categorias de evento manual do widget "Calendário" (`app/profissional/page.tsx`) — cor fixa por
 * categoria, conforme a spec do redesign visual. Jogo não entra aqui: é automático, vem de `jogos`
 * direto, com a cor `COR_CATEGORIA_JOGO`. */
export interface CategoriaEventoInfo {
  chave: EventoCalendarioCategoria;
  label: string;
  cor: string;
}

export const CATEGORIAS_EVENTO: CategoriaEventoInfo[] = [
  { chave: "treino", label: "Treino", cor: "#1E7A4C" },
  { chave: "viagem", label: "Viagem", cor: "#2F6FA3" },
  { chave: "reuniao", label: "Reunião", cor: "#B98F1E" },
  { chave: "prazo", label: "Prazo administrativo", cor: "#B4232C" },
  { chave: "outro", label: "Outro", cor: "#8A8D91" },
];

export const COR_CATEGORIA_JOGO = "#5C0A35";

export function corDaCategoria(categoria: EventoCalendarioCategoria): string {
  return CATEGORIAS_EVENTO.find((c) => c.chave === categoria)?.cor ?? "#8A8D91";
}

export function labelDaCategoria(categoria: EventoCalendarioCategoria): string {
  return CATEGORIAS_EVENTO.find((c) => c.chave === categoria)?.label ?? categoria;
}

export function tituloJogo(jogo: JogoRow): string {
  return jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`;
}

/** Item unificado de calendário — um jogo ou um evento manual, no mesmo formato pra ordenar e
 * agrupar por dia junto (widget "Calendário" e widget "Mural" usam a mesma lista, ver a spec). */
export type ItemCalendario =
  | { tipo: "jogo"; data: string; horario: string | null; titulo: string; jogo: JogoRow }
  | {
      tipo: "evento";
      data: string;
      horario: string | null;
      titulo: string;
      categoria: EventoCalendarioCategoria;
      evento: EventoCalendarioRow;
    };

/** Junta jogos + eventos manuais num só array ordenado por data/horário (sem horário fica no fim
 * do dia) — fonte comum pro widget "Calendário" (grade do mês) e pro widget "Mural" (próximos 10
 * dias), pra nunca ficarem dessincronizados sobre o que existe. */
export function montarItensCalendario(jogos: JogoRow[], eventos: EventoCalendarioRow[]): ItemCalendario[] {
  const itensJogo: ItemCalendario[] = jogos.map((jogo) => ({
    tipo: "jogo",
    data: jogo.data_jogo,
    horario: jogo.horario,
    titulo: tituloJogo(jogo),
    jogo,
  }));
  const itensEvento: ItemCalendario[] = eventos.map((evento) => ({
    tipo: "evento",
    data: evento.data,
    horario: evento.horario,
    titulo: evento.titulo,
    categoria: evento.categoria,
    evento,
  }));
  return [...itensJogo, ...itensEvento].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    const horaA = a.horario ?? "99:99";
    const horaB = b.horario ?? "99:99";
    return horaA < horaB ? -1 : horaA > horaB ? 1 : 0;
  });
}

/** Agrupa itens por dia (chave "YYYY-MM-DD") — usado pra desenhar a grade do mês (cada quadrado de
 * dia pega sua lista aqui) e a lista detalhada abaixo dela. Preserva a ordem de entrada (já
 * ordenada por `montarItensCalendario`), então dois itens no mesmo dia nunca se sobrescrevem. */
export function agruparPorDia(itens: ItemCalendario[]): Map<string, ItemCalendario[]> {
  const mapa = new Map<string, ItemCalendario[]>();
  for (const item of itens) {
    const lista = mapa.get(item.data) ?? [];
    lista.push(item);
    mapa.set(item.data, lista);
  }
  return mapa;
}

/** Diferença em dias entre duas datas ISO ("YYYY-MM-DD"), sempre `dataB - dataA`. Usa Date.UTC
 * (não `new Date(string)` direto) pra tratar as duas como "dias soltos" sem hora — evita o mesmo
 * tipo de bug de fuso horário já corrigido em `lib/data-brasil.ts`. */
export function diasEntre(dataA: string, dataB: string): number {
  const [anoA, mesA, diaA] = dataA.split("-").map(Number);
  const [anoB, mesB, diaB] = dataB.split("-").map(Number);
  const utcA = Date.UTC(anoA, mesA - 1, diaA);
  const utcB = Date.UTC(anoB, mesB - 1, diaB);
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

/** Soma (ou subtrai, com `dias` negativo) dias a uma data ISO ("YYYY-MM-DD"), devolvendo outra
 * data ISO. Mesmo cuidado de `diasEntre`: usa Date.UTC pra não sofrer com fuso horário. Usado pra
 * calcular a janela de 10 dias do Mural (que pode atravessar pro mês seguinte). */
export function adicionarDias(dataStr: string, dias: number): string {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export type Urgencia = "urgente" | "atencao" | "ok";

/** Um item pronto pra exibir no widget "Mural" — já achatado (título/subtítulo/cor calculados),
 * pra o componente não precisar entender de onde o item veio (jogo, evento manual ou contrato
 * vencendo — ver `itensMural`/`contratosParaMural`). `href` só existe quando o item linka pra
 * algum lugar (contrato → perfil do atleta); jogos e eventos não linkam daqui. */
export interface ItemMural {
  titulo: string;
  subtitulo: string | null;
  cor: string;
  diasRestantes: number;
  urgencia: Urgencia;
  href: string | null;
}

function urgenciaPorDias(diasRestantes: number): Urgencia {
  return diasRestantes <= 2 ? "urgente" : diasRestantes <= 5 ? "atencao" : "ok";
}

/** Regra do Mural: mesma janela usada em `/avisos` (`DIAS_PRAZO_CURTO`) — um item (jogo ou evento
 * manual) entra quando falta até `diasPrazo` dias pra data dele, e some sozinho quando a data
 * passa (não mostra atrasado). Badge de urgência: vermelho até 2 dias, amarelo até 5, verde até
 * `diasPrazo`. */
export function itensMural(itens: ItemCalendario[], hojeStr: string, diasPrazo = 10): ItemMural[] {
  return itens
    .map((item) => ({ item, diasRestantes: diasEntre(hojeStr, item.data) }))
    .filter(({ diasRestantes }) => diasRestantes >= 0 && diasRestantes <= diasPrazo)
    .map(({ item, diasRestantes }) => ({
      titulo: item.titulo,
      subtitulo: item.horario ? item.horario.slice(0, 5) : null,
      cor: item.tipo === "jogo" ? COR_CATEGORIA_JOGO : corDaCategoria(item.categoria),
      diasRestantes,
      urgencia: urgenciaPorDias(diasRestantes),
      href: null,
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/** Só os campos que a tela de Início precisa pra contrato vencendo (barra de resumo e Mural) —
 * evita puxar o `AtletaRow` inteiro (RG, CPF, endereço etc.) numa consulta que só usa
 * nome/posição/prazo. */
export type AtletaParaContratoVencendo = Pick<AtletaRow, "id" | "nome_completo" | "posicao" | "data_fim_contrato">;

/** Contrato vencendo dentro da janela do Mural (10 dias por padrão, mesmas faixas de urgência de
 * `itensMural`) — vira um item do Mural em vez do widget dedicado "Contratos vencendo" que existia
 * antes (o usuário achou pouco útil como card fixo na Home; pediu pra virar aviso só quando a data
 * estiver perto, igual jogos/eventos). Diferente de `atletasContratoVencendo` (janela de 90 dias,
 * faixas 30/90, usada só na contagem da barra de resumo) — este aqui é especificamente pro Mural. */
export function contratosParaMural(atletas: AtletaParaContratoVencendo[], hojeStr: string, diasPrazo = 10): ItemMural[] {
  return atletas
    .filter((a): a is AtletaParaContratoVencendo & { data_fim_contrato: string } => a.data_fim_contrato !== null)
    .map((atleta) => ({ atleta, diasRestantes: diasEntre(hojeStr, atleta.data_fim_contrato) }))
    .filter(({ diasRestantes }) => diasRestantes >= 0 && diasRestantes <= diasPrazo)
    .map(({ atleta, diasRestantes }) => ({
      titulo: `Contrato de ${atleta.nome_completo} vencendo`,
      subtitulo: atleta.posicao,
      cor: "#B4232C",
      diasRestantes,
      urgencia: urgenciaPorDias(diasRestantes),
      href: `/atletas/${atleta.id}`,
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

export interface AtletaContratoVencendo {
  atleta: AtletaParaContratoVencendo;
  diasRestantes: number;
  /** Nunca "ok" aqui — é uma janela só de alerta (90 dias), diferente da 3ª faixa do Mural. */
  urgencia: "urgente" | "atencao";
}

/** Atletas com `data_fim_contrato` dentro da janela de alerta (90 dias por padrão) — vermelho
 * quando faltam 30 dias ou menos, amarelo até 90. Contrato já vencido (data no passado) não entra
 * — é o widget de "vencendo", não de "vencido". */
export function atletasContratoVencendo(
  atletas: AtletaParaContratoVencendo[],
  hojeStr: string,
  diasJanela = 90,
): AtletaContratoVencendo[] {
  return atletas
    .filter((a): a is AtletaParaContratoVencendo & { data_fim_contrato: string } => a.data_fim_contrato !== null)
    .map((atleta) => ({ atleta, diasRestantes: diasEntre(hojeStr, atleta.data_fim_contrato) }))
    .filter(({ diasRestantes }) => diasRestantes >= 0 && diasRestantes <= diasJanela)
    .map(({ atleta, diasRestantes }) => ({
      atleta,
      diasRestantes,
      urgencia: (diasRestantes <= 30 ? "urgente" : "atencao") as "urgente" | "atencao",
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

export interface DiaGrade {
  /** "YYYY-MM-DD" */
  data: string;
  /** false pros dias de preenchimento do mês anterior/seguinte, só pra completar a semana. */
  noMes: boolean;
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Grade do mês em semanas completas (múltiplo de 7 dias, domingo a sábado) — inclui os últimos
 * dias do mês anterior e os primeiros do mês seguinte quando precisa pra fechar a primeira/última
 * semana, marcados com `noMes: false` (renderizados apagados, sem interação). `mes` é 1-12. */
export function gradeDoMes(ano: number, mes: number): DiaGrade[] {
  const diaSemanaPrimeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const dias: DiaGrade[] = [];
  for (let i = diaSemanaPrimeiro; i > 0; i--) {
    dias.push({ data: formatISO(new Date(Date.UTC(ano, mes - 1, 1 - i))), noMes: false });
  }
  for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
    dias.push({ data: formatISO(new Date(Date.UTC(ano, mes - 1, dia))), noMes: true });
  }
  let diaSeguinte = 1;
  while (dias.length % 7 !== 0) {
    dias.push({ data: formatISO(new Date(Date.UTC(ano, mes, diaSeguinte))), noMes: false });
    diaSeguinte += 1;
  }
  return dias;
}

/** Primeiro e último dia do mês (ISO), pra filtrar `jogos`/`eventos_calendario` só do mês corrente
 * — usado tanto pela Home (widget "Calendário") quanto pela rota de PDF, os dois precisam do mesmo
 * recorte. `mes` é 1-12. */
export function limitesDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  return {
    inicio: formatISO(new Date(Date.UTC(ano, mes - 1, 1))),
    fim: formatISO(new Date(Date.UTC(ano, mes, 0))),
  };
}
