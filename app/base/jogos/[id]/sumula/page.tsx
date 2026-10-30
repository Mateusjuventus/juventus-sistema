import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { verificarAcessoJogoBase } from "@/lib/auth/jogos-base-guard";
import { categoriaDaPosicao, corCategoriaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import { SUMULA_EVENTO_TIPO_ICONE, SUMULA_EVENTO_TIPO_LABEL } from "@/lib/futebol/sumula-eventos";
import {
  calcularMinutoAbsoluto,
  calcularMinutosJogados,
  type EventoParaEstatistica,
} from "@/lib/futebol/estatisticas-atleta";
import { avisosFormatoPartidaBase } from "@/lib/futebol/formato-partida-base";
import type {
  AtletaRow,
  CompeticaoBaseRow,
  CompeticaoJogoBaseRow,
  ConvocacaoAtletaRow,
  ConvocacaoRow,
  SumulaRow,
  SumulaEventoRow,
} from "@/lib/supabase/types";
import { DadosJogoFormBase } from "./dados-jogo-form-base";
import { EventoFormBase, type ConvocadoOption } from "./evento-form-base";
import { ImportarSumulaFormBase } from "./importar-sumula-form";
import { adicionarEventoBase, removerEventoBase, salvarDadosJogoBase } from "./actions";

/** Espelha `app/jogos/[id]/sumula/page.tsx` para o Futebol de Base — atletas filtrados pela mesma
 * categoria do jogo, igual à Convocação (Base). */

function paraOpcao(atleta: AtletaRow): ConvocadoOption {
  return {
    id: atleta.id,
    nome: atleta.nome_completo,
    numeroCamisa: atleta.numero_camisa,
    sigla: siglaCategoriaPosicao(categoriaDaPosicao(atleta.posicao)),
  };
}

function nomeAtletaEvento(atleta: AtletaRow | undefined): string {
  if (!atleta) return "Atleta não encontrado";
  return atleta.numero_camisa ? `${atleta.nome_completo} (#${atleta.numero_camisa})` : atleta.nome_completo;
}

function LinhaEvento({
  evento,
  atletasMap,
  duracaoPrimeiroTempo,
  duracaoSegundoTempo,
  acrescimoPrimeiroTempo,
  acrescimoSegundoTempo,
}: {
  evento: SumulaEventoRow;
  atletasMap: Map<string, AtletaRow>;
  duracaoPrimeiroTempo: number;
  /** Só precisa ser informado quando o jogo tem 3º tempo — usado pra deslocar o "relógio corrido"
   * de eventos do 3º tempo (ver `calcularMinutoAbsoluto`). */
  duracaoSegundoTempo?: number;
  /** Acréscimo lançado em cada tempo (ver 0147_sumula_acrescimo.sql) — desloca o "relógio corrido"
   * dos eventos do tempo seguinte, igual à duração regulamentar. */
  acrescimoPrimeiroTempo?: number;
  acrescimoSegundoTempo?: number;
}) {
  const atleta = evento.atleta_id ? atletasMap.get(evento.atleta_id) : undefined;
  // Mostra o "relógio corrido" do jogo (ex: 79'), igual à súmula oficial — por baixo, guardamos
  // o minuto relativo ao início de cada tempo (ver lib/futebol/estatisticas-atleta.ts).
  const minutoExibido = calcularMinutoAbsoluto(
    evento.tempo,
    evento.minuto,
    duracaoPrimeiroTempo,
    duracaoSegundoTempo,
    acrescimoPrimeiroTempo,
    acrescimoSegundoTempo,
  );

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
        {evento.tempo === "terceiro" ? (
          <span className="ml-1 text-xs font-normal text-neutral-400">({evento.minuto}&apos; do 3T)</span>
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
  duracaoSegundoTempo,
  acrescimoPrimeiroTempo,
  acrescimoSegundoTempo,
}: {
  label: string;
  tempo: "primeiro" | "segundo" | "terceiro";
  eventos: SumulaEventoRow[];
  atletasMap: Map<string, AtletaRow>;
  jogoId: string;
  convocados: ConvocadoOption[];
  reservas: ConvocadoOption[];
  liberado: boolean;
  duracaoPrimeiroTempo: number;
  /** Ver `LinhaEvento.duracaoSegundoTempo` — só usado pra exibir o relógio corrido do 3º tempo. */
  duracaoSegundoTempo?: number;
  /** Ver `LinhaEvento.acrescimoPrimeiroTempo`/`acrescimoSegundoTempo`. */
  acrescimoPrimeiroTempo?: number;
  acrescimoSegundoTempo?: number;
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
            duracaoSegundoTempo={duracaoSegundoTempo}
            acrescimoPrimeiroTempo={acrescimoPrimeiroTempo}
            acrescimoSegundoTempo={acrescimoSegundoTempo}
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

  const jogo = await verificarAcessoJogoBase(supabase, params.id);
  if (!jogo) notFound();
  const categoria = jogo.categoria;

  const [{ data: atletasData }, { data: convocacaoData }, { data: sumulaData }, { data: vinculoData }] =
    await Promise.all([
      supabase
        .from("atletas")
        .select("*")
        .eq("categoria", categoria)
        .order("nome_completo", { ascending: true }),
      supabase.from("convocacoes").select("*").eq("jogo_id", params.id).maybeSingle(),
      supabase.from("sumulas").select("*").eq("jogo_id", params.id).maybeSingle(),
      // Formato de partida (3º tempo, regras de substituição por tempo etc.) vem da competição à
      // qual este jogo está vinculado — ver docs/superpowers/specs/2026-10-21-competicoes-
      // formato-partida-design.md. A maioria dos jogos não está vinculada a nenhuma: nesse caso
      // segue tudo exatamente como antes (2 tempos, sem avisos).
      supabase.from("competicao_jogos_base").select("competicao_id").eq("jogo_id", params.id).maybeSingle(),
    ]);

  const atletas = (atletasData ?? []) as AtletaRow[];
  const atletasMap = new Map(atletas.map((a) => [a.id, a]));
  const convocacao = convocacaoData as ConvocacaoRow | null;
  const sumula = sumulaData as SumulaRow | null;

  const vinculo = vinculoData as Pick<CompeticaoJogoBaseRow, "competicao_id"> | null;
  let competicaoFormato: CompeticaoBaseRow | null = null;
  if (vinculo) {
    const { data: competicaoData } = await supabase
      .from("competicoes_base")
      .select("*")
      .eq("id", vinculo.competicao_id)
      .maybeSingle();
    competicaoFormato = competicaoData as CompeticaoBaseRow | null;
  }
  const temTerceiroTempo = competicaoFormato?.numero_tempos === 3;

  // Duração padrão de cada tempo quando a Súmula ainda não tem nada salvo — usa a duração
  // configurada na competição vinculada (ex: Sub-17 = 40min, ver 0143_cadastro_formato_partida_
  // sub15_sub17_sub20.sql) em vez de cair direto no 45 fixo do Profissional. Só os jogos SEM
  // competição vinculada (ou vinculados a uma que não configurou duração — ex: Sub-20) continuam
  // caindo no 45 padrão, exatamente como antes.
  const duracaoPadraoPrimeiroTempo = competicaoFormato?.duracao_tempo_1_minutos ?? 45;
  const duracaoPadraoSegundoTempo = competicaoFormato?.duracao_tempo_2_minutos ?? 45;
  const duracaoPadraoTerceiroTempo = competicaoFormato?.duracao_tempo_3_minutos ?? undefined;

  const duracaoPrimeiroTempoAtual = sumula?.duracao_primeiro_tempo ?? duracaoPadraoPrimeiroTempo;
  const duracaoSegundoTempoAtual = sumula?.duracao_segundo_tempo ?? duracaoPadraoSegundoTempo;
  const acrescimoPrimeiroTempoAtual = sumula?.acrescimo_primeiro_tempo ?? 0;
  const acrescimoSegundoTempoAtual = sumula?.acrescimo_segundo_tempo ?? 0;
  const acrescimoTerceiroTempoAtual = sumula?.acrescimo_terceiro_tempo ?? 0;

  let titulares: AtletaRow[] = [];
  let reservasAtletas: AtletaRow[] = [];
  if (convocacao) {
    const { data: caData } = await supabase
      .from("convocacao_atletas")
      .select("*")
      .eq("convocacao_id", convocacao.id);
    const rows = (caData ?? []) as ConvocacaoAtletaRow[];
    titulares = rows
      .filter((r) => r.status === "titular")
      .map((r) => atletasMap.get(r.atleta_id))
      .filter((a): a is AtletaRow => Boolean(a));
    reservasAtletas = rows
      .filter((r) => r.status === "reserva")
      .map((r) => atletasMap.get(r.atleta_id))
      .filter((a): a is AtletaRow => Boolean(a));
  }
  const convocadosOptions = [...titulares, ...reservasAtletas].map(paraOpcao);
  const reservasOptions = reservasAtletas.map(paraOpcao);

  let eventos: SumulaEventoRow[] = [];
  if (sumula) {
    const { data: eventosData } = await supabase
      .from("sumula_eventos")
      .select("*")
      .eq("sumula_id", sumula.id)
      .order("minuto", { ascending: true })
      .order("ordem", { ascending: true });
    eventos = (eventosData ?? []) as SumulaEventoRow[];
  }
  const eventosPrimeiro = eventos.filter((e) => e.tempo === "primeiro");
  const eventosSegundo = eventos.filter((e) => e.tempo === "segundo");
  const eventosTerceiro = eventos.filter((e) => e.tempo === "terceiro");

  const nomeMandante = jogo.mandante ? "Juventus" : jogo.adversario_nome;
  const nomeVisitante = jogo.mandante ? jogo.adversario_nome : "Juventus";

  // Avisos de formato de partida (elenco mínimo, minutos mínimos por atleta, substituição fora da
  // regra do tempo) — só quando o jogo está vinculado a uma competição com essas regras
  // preenchidas, e só depois da Convocação salva (antes disso o "elenco em campo" nem existe
  // ainda). NUNCA bloqueiam o salvamento — ver a spec.
  let avisosFormatoPartida: string[] = [];
  if (competicaoFormato && convocacao) {
    const duracaoPrimeiroTempo = duracaoPrimeiroTempoAtual;
    const duracaoSegundoTempo = duracaoSegundoTempoAtual;
    const duracaoTerceiroTempo = sumula?.duracao_terceiro_tempo ?? null;
    const eventosParaEstatistica: EventoParaEstatistica[] = eventos.map((e) => ({
      tipo: e.tipo,
      tempo: e.tempo,
      minuto: e.minuto,
      atletaId: e.atleta_id,
      atletaEntrouId: e.atleta_entrou_id,
      atletaAssistenciaId: e.atleta_assistencia_id,
      ordem: e.ordem,
    }));
    const atletasNaSumula = [...titulares, ...reservasAtletas].map((a) => ({
      atletaId: a.id,
      nome: nomeAtletaEvento(a),
      minutosJogados: calcularMinutosJogados(
        a.id,
        titulares.some((t) => t.id === a.id) ? "titular" : "reserva",
        duracaoPrimeiroTempo,
        duracaoSegundoTempo,
        eventosParaEstatistica,
        duracaoTerceiroTempo,
        acrescimoPrimeiroTempoAtual,
        acrescimoSegundoTempoAtual,
        acrescimoTerceiroTempoAtual,
      ),
    }));
    avisosFormatoPartida = avisosFormatoPartidaBase(
      {
        numeroTempos: competicaoFormato.numero_tempos,
        elencoMinimoEmCampo: competicaoFormato.elenco_minimo_em_campo,
        minutosMinimosPorAtleta: competicaoFormato.minutos_minimos_por_atleta,
        regraTempo1: competicaoFormato.regra_tempo_1,
        regraTempo2: competicaoFormato.regra_tempo_2,
        regraTempo3: competicaoFormato.regra_tempo_3,
      },
      atletasNaSumula,
      eventosParaEstatistica,
    );
  }

  return (
    <AppShell departamento="futebol_base" breadcrumb="Súmula">
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
        penaltisPro={jogo.penaltis_pro}
        penaltisContra={jogo.penaltis_contra}
        duracaoPrimeiroTempo={duracaoPrimeiroTempoAtual}
        duracaoSegundoTempo={duracaoSegundoTempoAtual}
        duracaoTerceiroTempo={sumula?.duracao_terceiro_tempo ?? duracaoPadraoTerceiroTempo}
        temTerceiroTempo={temTerceiroTempo}
        acrescimoPrimeiroTempo={acrescimoPrimeiroTempoAtual}
        acrescimoSegundoTempo={acrescimoSegundoTempoAtual}
        acrescimoTerceiroTempo={acrescimoTerceiroTempoAtual}
        nomeMandante={nomeMandante}
        nomeVisitante={nomeVisitante}
      />

      {avisosFormatoPartida.length > 0 ? (
        <div className="mt-4 card border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">
            Avisos de formato de partida
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {avisosFormatoPartida.map((aviso, i) => (
              <li key={i}>{aviso}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <ImportarSumulaFormBase
          jogoId={jogo.id}
          mandante={jogo.mandante}
          atletasConvocados={convocadosOptions.map((c) => ({ id: c.id, nome: c.nome }))}
          atletasElenco={atletas.map((a) => ({ id: a.id, nome: nomeAtletaEvento(a) }))}
        />
      </div>

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
                      className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold ${corCategoriaPosicao(categoriaDaPosicao(a.posicao))}`}
                    >
                      {siglaCategoriaPosicao(categoriaDaPosicao(a.posicao))}
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
                      className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold ${corCategoriaPosicao(categoriaDaPosicao(a.posicao))}`}
                    >
                      {siglaCategoriaPosicao(categoriaDaPosicao(a.posicao))}
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
          duracaoPrimeiroTempo={duracaoPrimeiroTempoAtual}
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
          duracaoPrimeiroTempo={duracaoPrimeiroTempoAtual}
          acrescimoPrimeiroTempo={acrescimoPrimeiroTempoAtual}
        />
        {temTerceiroTempo ? (
          <TempoSection
            label="Terceiro Tempo"
            tempo="terceiro"
            eventos={eventosTerceiro}
            atletasMap={atletasMap}
            jogoId={jogo.id}
            convocados={convocadosOptions}
            reservas={reservasOptions}
            liberado={Boolean(convocacao)}
            duracaoPrimeiroTempo={duracaoPrimeiroTempoAtual}
            duracaoSegundoTempo={duracaoSegundoTempoAtual}
            acrescimoPrimeiroTempo={acrescimoPrimeiroTempoAtual}
            acrescimoSegundoTempo={acrescimoSegundoTempoAtual}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
