import {
  CATEGORIAS_EVENTO,
  COR_CATEGORIA_JOGO,
  corDaCategoria,
  type DiaGrade,
  type ItemCalendario,
} from "@/lib/futebol/calendario";
import { criarEventoCalendario, excluirEventoCalendario } from "./calendario-actions";
import { CalendarioForm } from "./calendario-form";

const JUVENTUS_LOGO_PATH = "/brand/juventus-escudo-mark.png";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  return horario ? horario.slice(0, 5) : null;
}

/** Escudo pequeno (14px) dentro do quadrado do dia — mesma regra de posicionamento usada no resto
 * do sistema (mandante primeiro à esquerda). `logoUrl` null cai num círculo com as 3 primeiras
 * letras do nome, igual ao card de "Próximo jogo" já fazia antes do redesign. */
function EscudoMini({ logoUrl, nome }: { logoUrl: string | null; nome: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={nome} className="h-3.5 w-3.5 rounded-full border border-white bg-white object-contain" />;
  }
  return (
    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-neutral-100 text-[6px] font-bold text-neutral-400">
      {nome.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Um quadrado de dia da grade — jogos ganham destaque (2 escudos + horário, é o pedido explícito
 * do usuário), eventos manuais viram um ponto colorido + título abreviado. Cabe no máximo 2
 * indicadores por quadrado; o resto conta num "+N" (o texto completo está sempre na lista
 * detalhada abaixo da grade, e no `title` do quadrado pro hover). */
function DiaCelula({
  dia,
  itens,
  logoPorJogoId,
  hojeStr,
}: {
  dia: DiaGrade;
  itens: ItemCalendario[];
  logoPorJogoId: Map<string, string | null>;
  hojeStr: string;
}) {
  const numeroDia = Number(dia.data.slice(8, 10));
  const ehHoje = dia.data === hojeStr;
  const visiveis = itens.slice(0, 2);
  const restantes = itens.length - visiveis.length;

  const tooltip = itens
    .map((item) => {
      const hora = formatHorario(item.horario);
      const local = item.tipo === "jogo" ? item.jogo.local_estadio : null;
      return [item.titulo, hora, local].filter(Boolean).join(" · ");
    })
    .join("\n");

  return (
    <div
      title={tooltip || undefined}
      className={`flex min-h-[74px] flex-col gap-1 rounded-md border p-1.5 ${
        dia.noMes ? "border-transparent bg-transparent opacity-40" : "border-linha bg-white"
      } ${ehHoje ? "ring-2 ring-dourado ring-inset" : ""}`}
    >
      <span className={`text-[11px] font-semibold ${ehHoje ? "text-dourado" : "text-neutral-500"}`}>{numeroDia}</span>
      <div className="flex flex-col gap-0.5">
        {visiveis.map((item, i) => {
          if (item.tipo === "jogo") {
            const logoAdversario = logoPorJogoId.get(item.jogo.id) ?? null;
            const juventus = { nome: "Juventus", logo: JUVENTUS_LOGO_PATH };
            const adversario = { nome: item.jogo.adversario_nome, logo: logoAdversario };
            const [ladoEsquerdo, ladoDireito] = item.jogo.mandante ? [juventus, adversario] : [adversario, juventus];
            return (
              <div key={i} className="flex items-center gap-0.5 rounded bg-grena/10 px-1 py-0.5">
                <EscudoMini logoUrl={ladoEsquerdo.logo} nome={ladoEsquerdo.nome} />
                <EscudoMini logoUrl={ladoDireito.logo} nome={ladoDireito.nome} />
                {formatHorario(item.horario) ? (
                  <span className="truncate text-[9px] font-semibold text-grena-escuro">{formatHorario(item.horario)}</span>
                ) : null}
              </div>
            );
          }
          return (
            <div key={i} className="flex items-center gap-1 overflow-hidden">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: corDaCategoria(item.categoria) }} />
              <span className="truncate text-[9px] text-neutral-600">{item.titulo}</span>
            </div>
          );
        })}
        {restantes > 0 ? <span className="text-[9px] font-medium text-neutral-400">+{restantes}</span> : null}
      </div>
    </div>
  );
}

/**
 * Widget "Calendário" — o maior da coluna central da Home do Futebol Profissional (ver a spec do
 * redesign visual). Mostra só o mês corrente (sem navegação pra outros meses — não fazia parte do
 * mockup aprovado; pode virar um ajuste futuro se precisar). Jogos e eventos manuais entram juntos
 * na mesma grade — `itensPorDia`/`itensDoMes` já vêm prontos de `lib/futebol/calendario.ts`.
 */
export function CalendarioWidget({
  ano,
  mes,
  grade,
  itensPorDia,
  itensDoMes,
  logoPorJogoId,
  hojeStr,
}: {
  ano: number;
  mes: number;
  grade: DiaGrade[];
  itensPorDia: Map<string, ItemCalendario[]>;
  itensDoMes: ItemCalendario[];
  logoPorJogoId: Map<string, string | null>;
  hojeStr: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-grena-escuro">
          Calendário — {MESES[mes - 1]} de {ano}
        </h2>
        <div className="flex items-center gap-2">
          <a
            href="/profissional/calendario/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs"
          >
            Gerar PDF
          </a>
          <CalendarioForm action={criarEventoCalendario} dataInicial={hojeStr} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            {d}
          </div>
        ))}
        {grade.map((dia) => (
          <DiaCelula
            key={dia.data}
            dia={dia}
            itens={itensPorDia.get(dia.data) ?? []}
            logoPorJogoId={logoPorJogoId}
            hojeStr={hojeStr}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-linha pt-3">
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_CATEGORIA_JOGO }} />
          Jogo
        </span>
        {CATEGORIAS_EVENTO.map((c) => (
          <span key={c.chave} className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
            {c.label}
          </span>
        ))}
      </div>

      {itensDoMes.length > 0 ? (
        <div className="mt-4 space-y-1.5 border-t border-linha pt-3">
          {itensDoMes.map((item, i) => {
            const hora = formatHorario(item.horario);
            const local = item.tipo === "jogo" ? item.jogo.local_estadio : null;
            return (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.tipo === "jogo" ? COR_CATEGORIA_JOGO : corDaCategoria(item.categoria) }}
                  />
                  <span className="shrink-0 font-medium text-neutral-500">{formatData(item.data)}</span>
                  <span className="truncate text-neutral-800">{item.titulo}</span>
                  {hora ? <span className="shrink-0 text-neutral-400">{hora}</span> : null}
                  {local ? <span className="hidden shrink-0 truncate text-neutral-400 sm:inline">· {local}</span> : null}
                  {item.tipo === "evento" && item.evento.observacao ? (
                    <span className="hidden shrink-0 truncate text-neutral-400 sm:inline">· {item.evento.observacao}</span>
                  ) : null}
                </div>
                {item.tipo === "evento" ? (
                  <form action={excluirEventoCalendario}>
                    <input type="hidden" name="id" value={item.evento.id} />
                    <button type="submit" className="shrink-0 text-xs text-neutral-400 hover:text-red-700">
                      Remover
                    </button>
                  </form>
                ) : (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-300">
                    {item.jogo.competicao}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 border-t border-linha pt-3 text-center text-sm text-neutral-400">
          Nenhum jogo ou evento neste mês.
        </p>
      )}
    </div>
  );
}
