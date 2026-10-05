import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import type { RendimentoDemandas } from "@/lib/demandas/rendimento";
import { corPrazoDemanda, type CorPrazoDemanda } from "@/lib/demandas/cor-prazo";
import type { DemandaRow } from "@/lib/supabase/types";

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

const COR_DOT: Record<CorPrazoDemanda, string> = {
  verde: "bg-emerald-500",
  laranja: "bg-orange-500",
  vermelho: "bg-red-500",
};

/** Borda e rótulo do card inteiro pela pior urgência das pendências da pessoa — mesmo espírito de
 * `corBordaExtra`/`anelClassificacaoAtleta` em `AtletaCard` (um indicador de status já vira a
 * borda do card nesse sistema, não só uma bolinha solta). "Em dia" cobre tanto quem não tem
 * nenhuma pendência quanto quem só tem pendências sem prazo definido (não dá pra avaliar urgência
 * nesse segundo caso, mas também não há nada vermelho/laranja pra alertar). */
const BORDA_STATUS: Record<CorPrazoDemanda, string> = {
  vermelho: "border-red-500",
  laranja: "border-orange-500",
  verde: "border-emerald-500",
};
const ROTULO_STATUS: Record<CorPrazoDemanda, string> = {
  vermelho: "Atrasado",
  laranja: "Atenção",
  verde: "Em dia",
};
const TEXTO_STATUS: Record<CorPrazoDemanda, string> = {
  vermelho: "text-red-700",
  laranja: "text-orange-700",
  verde: "text-emerald-700",
};

function Medidor({ label, valor }: { label: string; valor: number | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-400">
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums text-neutral-700">{valor === null ? "—" : `${valor}%`}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-grena" style={{ width: `${valor ?? 0}%` }} />
      </div>
    </div>
  );
}

function Metrica({ label, valor, alerta }: { label: string; valor: string | number; alerta?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-1.5 text-center ${alerta ? "bg-red-50" : "bg-neutral-50"}`}>
      <p className={`text-base font-extrabold leading-none ${alerta ? "text-red-700" : "text-neutral-800"}`}>
        {valor}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}

/**
 * Card de uma pessoa acompanhada no Painel de Demandas do master (`/demandas`) — foto, nome,
 * função e as métricas de rendimento, lado a lado com as demais (ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 2, "Painel do Mateus"). Com `aoClicar`
 * preenchido, o card inteiro é um botão que abre a tela intermediária da pessoa
 * (`PessoaDemandasModal`) — pedido do Mateus em 05/10: "a tela de quando clicar em cima da pessoa,
 * não precisa abrir essa tela inteira, abra aquela intermediária" (mesmo padrão de clicar num card
 * e abrir um modal, não navegar, já usado em `FisioterapiaListagem`/`HistoricoStatusModal`). A
 * borda colorida pela pior pendência (vermelho/laranja/verde) foi acrescentada no pedido seguinte
 * do Mateus de melhorar o design do painel — dá pra ver quem precisa de atenção sem abrir nada.
 */
export function PessoaAcompanhadaCard({
  nome,
  funcao,
  fotoUrl,
  rendimento,
  pendencias,
  hojeStr,
  aoClicar,
}: {
  nome: string;
  funcao: string;
  fotoUrl: string | null;
  rendimento: RendimentoDemandas;
  /** Demandas em aberto, já ordenadas (prazo mais próximo primeiro) — mostra só as primeiras
   * algumas, o resto fica só na contagem de "Pendências". */
  pendencias: DemandaRow[];
  /** "Hoje" em Brasília (`hojeBrasilia()`), vindo do pai — pra bater exatamente com o `hojeStr` já
   * usado em `calcularRendimento`, em vez de recalcular aqui com o fuso do servidor. */
  hojeStr: string;
  /** Sem isso, o card não é clicável (ex.: um uso futuro fora do painel do master). */
  aoClicar?: () => void;
}) {
  const LIMITE_PENDENCIAS_EXIBIDAS = 4;

  const cores = pendencias.map((d) => corPrazoDemanda(d.prazo, d.status, hojeStr));
  const piorCor: CorPrazoDemanda = cores.includes("vermelho")
    ? "vermelho"
    : cores.includes("laranja")
      ? "laranja"
      : "verde";

  return (
    <div
      role={aoClicar ? "button" : undefined}
      tabIndex={aoClicar ? 0 : undefined}
      onClick={aoClicar}
      onKeyDown={
        aoClicar
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                aoClicar();
              }
            }
          : undefined
      }
      className={`card border-2 p-4 ${BORDA_STATUS[piorCor]} ${
        aoClicar ? "cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-dourado" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <AtletaAvatarCirculo nome={nome} fotoUrl={fotoUrl} className="h-12 w-12" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-neutral-800">{nome}</p>
            <p className="truncate text-xs text-neutral-500">{funcao}</p>
          </div>
        </div>
        <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wide ${TEXTO_STATUS[piorCor]}`}>
          {ROTULO_STATUS[piorCor]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Medidor label="Hoje" valor={rendimento.percentualHoje} />
        <Medidor label="Na semana" valor={rendimento.percentualSemana} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Metrica label="Pendentes" valor={rendimento.pendentes} alerta={rendimento.pendentes > 0} />
        <Metrica label="Atrasadas" valor={rendimento.atrasadas} alerta={rendimento.atrasadas > 0} />
        <Metrica label="Concl. 30d" valor={rendimento.concluidasUltimos30Dias} />
      </div>

      {pendencias.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
          {pendencias.slice(0, LIMITE_PENDENCIAS_EXIBIDAS).map((d) => {
            const prazoFormatado = formatData(d.prazo);
            const cor = corPrazoDemanda(d.prazo, d.status, hojeStr);
            return (
              <div key={d.id} className="flex items-center gap-1.5 text-xs">
                {cor ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COR_DOT[cor]}`} aria-hidden /> : null}
                <span className="min-w-0 flex-1 truncate text-neutral-600">{d.titulo}</span>
                {prazoFormatado ? (
                  <span className={`shrink-0 ${cor === "vermelho" ? "font-semibold text-red-700" : "text-neutral-400"}`}>
                    {prazoFormatado}
                  </span>
                ) : null}
              </div>
            );
          })}
          {pendencias.length > LIMITE_PENDENCIAS_EXIBIDAS ? (
            <p className="text-xs text-neutral-400">+{pendencias.length - LIMITE_PENDENCIAS_EXIBIDAS} outra(s)</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-400">Nenhuma pendência. 🎉</p>
      )}
    </div>
  );
}
