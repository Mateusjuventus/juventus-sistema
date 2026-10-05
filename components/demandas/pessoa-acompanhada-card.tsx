import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import type { RendimentoDemandas } from "@/lib/demandas/rendimento";
import type { DemandaRow } from "@/lib/supabase/types";

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
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
 * função e as 5 métricas de rendimento, lado a lado com as demais (ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 2, "Painel do Mateus").
 */
export function PessoaAcompanhadaCard({
  nome,
  funcao,
  fotoUrl,
  rendimento,
  pendencias,
}: {
  nome: string;
  funcao: string;
  fotoUrl: string | null;
  rendimento: RendimentoDemandas;
  /** Demandas em aberto, já ordenadas (prazo mais próximo primeiro) — mostra só as primeiras
   * algumas, o resto fica só na contagem de "Pendências". */
  pendencias: DemandaRow[];
}) {
  const LIMITE_PENDENCIAS_EXIBIDAS = 4;
  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <AtletaAvatarCirculo nome={nome} fotoUrl={fotoUrl} className="h-12 w-12" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-800">{nome}</p>
          <p className="truncate text-xs text-neutral-500">{funcao}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Metrica label="Hoje" valor={rendimento.percentualHoje === null ? "—" : `${rendimento.percentualHoje}%`} />
        <Metrica
          label="Na semana"
          valor={rendimento.percentualSemana === null ? "—" : `${rendimento.percentualSemana}%`}
        />
        <Metrica label="Concl. 30d" valor={rendimento.concluidasUltimos30Dias} />
        <Metrica label="Pendentes" valor={rendimento.pendentes} alerta={rendimento.pendentes > 0} />
        <Metrica label="Atrasadas" valor={rendimento.atrasadas} alerta={rendimento.atrasadas > 0} />
      </div>

      {pendencias.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
          {pendencias.slice(0, LIMITE_PENDENCIAS_EXIBIDAS).map((d) => {
            const prazoFormatado = formatData(d.prazo);
            const atrasada = d.prazo !== null && d.prazo < hojeStr;
            return (
              <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-neutral-600">{d.titulo}</span>
                {prazoFormatado ? (
                  <span className={`shrink-0 ${atrasada ? "font-semibold text-red-700" : "text-neutral-400"}`}>
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
