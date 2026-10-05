import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDemandasAcompanhado } from "@/lib/auth/role";
import { DemandaStatusSelect } from "@/components/demanda-status";
import { updateDemandaStatus } from "@/app/minhas-demandas/actions";
import type { DemandaRow } from "@/lib/supabase/types";
import { NovaDemandaForm } from "./nova-demanda-form";

const LIMITE_EXIBIDAS = 5;

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Widget "Minhas Demandas" na tela inicial — só aparece pra quem o Mateus marcou como acompanhado
 * (`demandas_acompanhado` em `/usuarios`, ver docs/superpowers/specs/2026-10-05-assistencia-
 * social-e-demandas-design.md, Parte 2: "precisa ser algo fácil que sempre fica à vista dela").
 * Mesmo espírito dos widgets de `app/profissional/page.tsx` (`CalendarioWidget`, `MuralWidget`):
 * componente auto-suficiente, que resolve a própria permissão e os próprios dados, pra `app/
 * profissional/page.tsx`/`app/base/page.tsx` só precisarem inserir `<MinhasDemandasWidget />` sem
 * mudar o resto da query da página. Mostra até 5 demandas abertas (mais antiga/com prazo mais
 * próximo primeiro) com troca de status embutida, o mini-form de criar logo abaixo, e um link "ver
 * tudo" quando há mais do que as exibidas.
 */
export async function MinhasDemandasWidget() {
  const supabase = createClient();
  const acompanhado = await getDemandasAcompanhado(supabase);
  if (!acompanhado) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("demandas")
    .select("*")
    .eq("responsavel_id", user.id)
    .neq("status", "concluido")
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const abertas = (data ?? []) as DemandaRow[];
  const exibidas = abertas.slice(0, LIMITE_EXIBIDAS);
  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Minhas Demandas</h2>
        {abertas.length > LIMITE_EXIBIDAS ? (
          <Link href="/minhas-demandas" className="text-xs font-semibold text-grena hover:underline">
            Ver tudo ({abertas.length})
          </Link>
        ) : null}
      </div>

      {exibidas.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">Nenhuma demanda em aberto. 🎉</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {exibidas.map((d) => {
            const prazoFormatado = formatData(d.prazo);
            const atrasada = d.prazo !== null && d.prazo < hojeStr;
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2">
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm text-neutral-800">{d.titulo}</p>
                  {prazoFormatado ? (
                    <p className={`text-xs ${atrasada ? "font-semibold text-red-700" : "text-neutral-400"}`}>
                      {atrasada ? "Atrasada · " : "Prazo: "}
                      {prazoFormatado}
                    </p>
                  ) : null}
                </div>
                <DemandaStatusSelect id={d.id} status={d.status} action={updateDemandaStatus} />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <NovaDemandaForm compacta />
      </div>
    </div>
  );
}
