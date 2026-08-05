import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { corCategoriaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import { SUMULA_EVENTO_TIPO_ICONE, SUMULA_EVENTO_TIPO_LABEL } from "@/lib/futebol/sumula-eventos";
import { calcularMinutoAbsoluto } from "@/lib/futebol/estatisticas-atleta";
import type {
  AtletaBaseRow,
  ConvocacaoAtletaBaseRow,
  ConvocacaoBaseRow,
  JogoBaseRow,
  SumulaBaseRow,
  SumulaEventoBaseRow,
} from "@/lib/supabase/types";
import { DadosJogoFormBase } from "./dados-jogo-form-base";
import { EventoFormBase, type ConvocadoOption } from "./evento-form-base";
import { adicionarEventoBase, removerEventoBase, salvarDadosJogoBase } from "./actions";

/** Espelha `app/jogos/[id]/sumula/page.tsx` para o Futebol de Base — atletas filtrados pela mesma
 * categoria do jogo, igual à Convocação (Base). */

function paraOpcao(atleta: AtletaBaseRow): ConvocadoOption {
  return {
    id: atleta.id,
    nome: atleta.nome_completo,
    numeroCamisa: atleta.numero_camisa,
    sigla: siglaCategoriaPosicao(atleta.categoria_posicao),
  };
}

function nomeAtletaEvento(atleta: AtletaBaseRow | undefined): string {
  if (!atleta) return "Atleta não encontrado";
  return atleta.numero_camisa ? `${atleta.nome_completo} (#${atleta.numero_camisa})` : atleta.nome_completo;
}

function LinhaEvento({
  evento,
  atletasMap,
  duracaoPrimeiroTempo,
}: {
  evento: SumulaEventoBaseRow;
  atletasMap: Map<string, AtletaBaseRow>;
  duracaoPrimeiroTempo: number;
}) {
  const atleta = evento.atleta_id ? atletasMap.get(evento.atleta_id) : undefined;
  // Mostra o "relógio corrido" do jogo (ex: 79'), igual à súmula oficial — por baixo, guardamos
  // o minuto relativo ao início de cada tempo (ver lib/futebol/estatisticas-atleta.ts).
  const minutoExibido = calcularMinutoAbsoluto(evento.tempo, evento.minuto, duracaoPrimeiroTempo);

  let descricao: string;
  if (evento.tipo === "substituicao") {
    const entrou = evento.atleta_entrou_id ? atletasMap.get(evento.atleta_entrou_id) : undefined;
    descricao = `Saiu: ${nomeAtletaEvento(atleta)} · Entrou: ${nomeAtletaEvento(entrou)}`;
  } else if (evento.tipo === "gol") {
    const assistencia = evento.atleta_assistencia_id ? atletasMap.get(evento.atleta_assistencia_id) : undefined;
    descricao = assistencia
      ? `${nomeAtletaEvento(atleta)} (assist. ${nomeAtletaEvento(assistencia)})`
      : nomeAtletaEvento(atleta);
  } else {
    descricao = nomeAtletaEvento(atleta);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">
      <span className="w-10 shrink-0 text-center text-lg">{SUMULA_EVENTO_TIPO_ICONE[evento.tipo]}</span>
      <span className="w-24 shrink-0 font-semibold text-grena-escuro">
        {minutoExibido}&apos;
        {evento.tempo === "segundo" ? (
          <span className="ml-1 text-xs font-normal text-neutral-400">({evento.minuto}&apos; do 2T)</span>
        ) : null}
      </span>
      <span className="w-32 shrink-0 font-medium text-neutral-700">
        {SUMULA_EVENTO_TIPO_LABEL[evento.tipo]}
      </span>
      <span className="min-w-[200px] flex-1 text-neutral-800">{descricao}</span>
      <DeleteButton action={removerEventoBase} id={evento.id} entityLabel="evento" />
    </div>
  );
}

function TempoSection({
  label,
  tempo,
  eventos,
  atletasMap,
  jogoId,
  convocados,
  reservas,
  liberado,
  duracaoPrimeiroTempo,
}: {
  label: string;
  tempo: "primeiro" | "segundo";
  eventos: SumulaEventoBaseRow[];
  atletasMap: Map<string, AtletaBaseRow>;
  jogoId: string;
  convocados: ConvocadoOption[];
  reservas: ConvocadoOption[];
  liberado: boolean;
  duracaoPrimeiroTempo: number;
}) {
  return (
    <section className="card p-4">
      <h2 className="text-lg font-bold text-grena-escuro">{label}</h2>

      <div className="mt-3 space-y-2">
        {eventos.map((evento) => (
          <LinhaEvento
            key={evento.id}
            evento={evento}
            atletasMap={atletasMap}
            duracaoPrimeiroTempo={duracaoPrimeiroTempo}
          />
        ))}
        {eventos.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum evento lançado ainda.</p>
        ) : null}
      </div>

      {liberado ? (
        <EventoFormBase
          action={adicionarEventoBase}
          jogoId={jogoId}
          tempo={tempo}
          convocados={convocados}
          reservas={reservas}
        />
      ) : (
        <p className="mt-3 text-sm text-neutral-400">
          Salve a Convocação primeiro pra liberar o lançamento de eventos.
        </p>
      )}
    </section>
  );
}

export default async function SumulaBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;
  const categoria = jogo.categoria;

  const [{ data: atletasData }, { data: convocacaoData }, { data: sumulaData }] = await Promise.all([
    supabase
      .from("atletas_base")
      .select("*")
      .eq("categoria", categoria)
      .order("nome_completo", { ascending: true }),
    supabase.from("convocacoes_base").select("*").eq("jogo_id", params.id).maybeSingle(),
    supabase.from("sumulas_base").select("*").eq("jogo_id", params.id).maybeSingle(),
  ]);

  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const atletasMap = new Map(atletas.map((a) => [a.id, a]));
  const convocacao = convocacaoData as ConvocacaoBaseRow | null;
  const sumula = sumulaData as SumulaBaseRow | null;

  let titulares: AtletaBaseRow[] = [];
  let reservasAtletas: AtletaBaseRow[] = [];
  if (convocacao) {
    const { data: caData } = await supabase
      .from("convocacao_atletas_base")
      .select("*")
      .eq("convocacao_id", convocacao.id);
    const rows = (caData ?? []) as ConvocacaoAtletaBaseRow[];
    titulares = rows
      .filter((r) => r.status === "titular")
      .map((r) => atletasMap.get(r.atleta_id))
      .filter((a): a is AtletaBaseRow => Boolean(a));
    reservasAtletas = rows
      .filter((r) => r.status === "reserva")
      .map((r) => atletasMap.get(r.atleta_id))
      .filter((a): a is AtletaBaseRow => Boolean(a));
  }
  const convocadosOptions = [...titulares, ...reservasAtletas].map(paraOpcao);
  const reservasOptions = reservasAtletas.map(paraOpcao);

  let eventos: SumulaEventoBaseRow[] = [];
  if (sumula) {
    const { data: eventosData } = await supabase
      .from("sumula_eventos_base")
      .select("*")
      .eq("sumula_id", sumula.id)
      .order("minuto", { ascending: true })
      .order("ordem", { ascending: true });
    eventos = (eventosData ?? []) as SumulaEventoBaseRow[];
  }
  const eventosPrimeiro = eventos.filter((e) => e.tempo === "primeiro");
  const eventosSegundo = eventos.filter((e) => e.tempo === "segundo");

  const nomeMandante = jogo.mandante ? "Juventus" : jogo.adversario_nome;
  const nomeVisitante = jogo.mandante ? jogo.adversario_nome : "Juventus";

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="sumula" />

      <div className="card mb-4 p-4">
        <p className="text-sm text-neutral-600">
          <span className="font-semibold text-grena-escuro">{nomeMandante}</span> ×{" "}
          <span className="font-semibold text-grena-escuro">{nomeVisitante}</span> — {jogo.competicao}
          {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""}
        </p>
      </div>

      <DadosJogoFormBase
        action={salvarDadosJogoBase}
        jogoId={jogo.id}
        golsPro={jogo.gols_pro}
        golsContra={jogo.gols_contra}
        duracaoPrimeiroTempo={sumula?.duracao_primeiro_tempo ?? 45}
        duracaoSegundoTempo={sumula?.duracao_segundo_tempo ?? 45}
        nomeMandante={nomeMandante}
        nomeVisitante={nomeVisitante}
      />

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Escalação (referência)</h2>
        {!convocacao ? (
          <p className="mt-2 text-sm text-neutral-400">
            Salve a Convocação primeiro pra liberar a escalação de referência e o lançamento de
            eventos.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Titulares ({titulares.length})
              </h3>
              <div className="mt-2 space-y-1">
                {titulares.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold ${corCategoriaPosicao(a.categoria_posicao)}`}
                    >
                      {siglaCategoriaPosicao(a.categoria_posicao)}
                    </span>
                    <span className="text-neutral-800">{nomeAtletaEvento(a)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Reservas ({reservasAtletas.length})
              </h3>
              <div className="mt-2 space-y-1">
                {reservasAtletas.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold ${corCategoriaPosicao(a.categoria_posicao)}`}
                    >
                      {siglaCategoriaPosicao(a.categoria_posicao)}
                    </span>
                    <span className="text-neutral-800">{nomeAtletaEvento(a)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 space-y-4">
        <TempoSection
          label="Primeiro Tempo"
          tempo="primeiro"
          eventos={eventosPrimeiro}
          atletasMap={atletasMap}
          jogoId={jogo.id}
          convocados={convocadosOptions}
          reservas={reservasOptions}
          liberado={Boolean(convocacao)}
          duracaoPrimeiroTempo={sumula?.duracao_primeiro_tempo ?? 45}
        />
        <TempoSection
          label="Segundo Tempo"
          tempo="segundo"
          eventos={eventosSegundo}
          atletasMap={atletasMap}
          jogoId={jogo.id}
          convocados={convocadosOptions}
          reservas={reservasOptions}
          liberado={Boolean(convocacao)}
          duracaoPrimeiroTempo={sumula?.duracao_primeiro_tempo ?? 45}
        />
      </div>
    </AppShell>
  );
}
