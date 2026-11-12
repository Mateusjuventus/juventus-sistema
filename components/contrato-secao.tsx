import Link from "next/link";
import type { AtletaContratoRow, AtletaContratoEvolucaoSalarialRow, AtletaContratoGatilhoRow } from "@/lib/supabase/types";
import {
  contratoTemRemuneracaoFormal,
  contratoVazio,
  diasRestantesContrato,
  direitosEconomicos,
  evolucoesProximas,
  statusContrato,
  valorEfetivoRubrica,
} from "@/lib/futebol/contrato";
import type { ProgressoGatilho } from "@/lib/futebol/gatilho-contrato";
import { hojeBrasilia } from "@/lib/data-brasil";
import { RUBRICA_CONTRATO_OPTIONS, METRICA_GATILHO_OPTIONS } from "@/lib/validation/schemas";
import type { CompeticaoDisponivelAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { EvolucaoSalarialForm } from "@/components/evolucao-salarial-form";
import { GatilhoContratoForm } from "@/components/gatilho-contrato-form";
import { ContratoFormacaoButton, type ContratoFormacaoAtletaCampos } from "@/components/contrato-formacao-button";
import {
  removerEvolucaoSalarial,
  salvarEvolucaoSalarial,
  criarGatilhoContrato,
  confirmarGatilhoContrato,
  removerGatilhoContrato,
} from "@/app/atletas/[id]/contrato/actions";

// Até 28/10/2026 este tipo era `AtletaContratoRow | AtletaBaseContratoRow` (Profissional e Base
// tinham tabelas/tipos próprios) — a unificação de Atletas mesclou os dois em `atleta_contratos`/
// `AtletaContratoRow` só, então o alias de união não é mais necessário. Mantido como alias (não
// inline) só pra não precisar tocar no resto do arquivo, que já usa `ContratoRow`.
type ContratoRow = AtletaContratoRow;

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Selo "Contrato Ativo"/"Contrato Vencido"/"Sem contrato" (ver `statusContrato` em
 * lib/futebol/contrato.ts) — cores seguem a mesma régua de urgência usada no resto do sistema
 * (verde=ok, vermelho=atenção, cinza=neutro). Exportado porque, a partir de 04/11/2026 (pedido do
 * Mateus ao ver a tela: "essa parte de contrato ativo deve aparecer lá em cima no nome dele"),
 * também aparece em `AtletaPerfilHeader`, ao lado do nome, não só aqui dentro da seção de Contrato. */
export function SeloStatusContrato({ status, label }: { status: "ativo" | "vencido" | "sem_contrato"; label: string }) {
  const cor =
    status === "ativo"
      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
      : status === "vencido"
        ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
        : "bg-neutral-100 text-neutral-500 ring-1 ring-inset ring-neutral-300";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{label}</span>;
}

function DireitosEconomicos({ contrato }: { contrato: ContratoRow }) {
  const partes = direitosEconomicos(contrato);

  if (partes.length === 0) return null;

  return (
    <div className="mt-3 border-t border-linha pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Direitos econômicos</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {partes.map((p) => (
          <span key={p.nome} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
            {p.nome}: {p.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** Lista de evoluções salariais de um contrato + (só no vigente) o mini-formulário de adicionar.
 * `editavel` decide se aparecem os controles (adicionar/remover) — contratos do histórico mostram
 * só a lista, sem poder mexer (ver docs/superpowers/specs/2026-11-04-contrato-atleta-extensoes-
 * design.md). */
function EvolucaoSalarialSecao({
  atletaId,
  contrato,
  evolucoes,
  editavel,
}: {
  atletaId: string;
  contrato: ContratoRow;
  evolucoes: AtletaContratoEvolucaoSalarialRow[];
  editavel: boolean;
}) {
  if (evolucoes.length === 0 && !editavel) return null;

  return (
    <div className="mt-3 border-t border-linha pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Evolução salarial</p>
      {evolucoes.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {evolucoes.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-1.5 text-sm">
              <span className="text-neutral-600">
                A partir de {formatData(e.data_vigencia)} —{" "}
                <span className="font-medium text-neutral-800">
                  {RUBRICA_CONTRATO_OPTIONS.find((r) => r.value === e.rubrica)?.label ?? e.rubrica}
                </span>{" "}
                passa a {formatMoeda(e.novo_valor)}
              </span>
              {editavel ? (
                <form action={removerEvolucaoSalarial}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="atletaId" value={atletaId} />
                  <button type="submit" className="shrink-0 text-xs text-neutral-400 hover:text-red-700">
                    Remover
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editavel ? (
        <div className="mt-2">
          <EvolucaoSalarialForm action={salvarEvolucaoSalarial} contratoId={contrato.id} atletaId={atletaId} />
        </div>
      ) : null}
    </div>
  );
}

/** Lista de Gatilhos (bônus por meta de desempenho) de um contrato + (só no vigente) o
 * mini-formulário de adicionar — ver docs/superpowers/specs/2026-11-04-contrato-atleta-gatilhos-
 * design.md. Mesmo padrão de `EvolucaoSalarialSecao`: `editavel` decide se aparecem os controles
 * (adicionar/confirmar/remover); contratos do histórico mostram só a lista, sem poder mexer.
 *
 * `progressoPorGatilho` vem calculado pela página (precisa de `buscarEstatisticasAtleta` filtrado
 * pelas Competições de cada gatilho — não é um cálculo puro que caiba aqui dentro) — chave é o
 * `id` do gatilho. Um gatilho sem entrada no mapa (ex.: contrato do histórico, onde não vale a
 * pena calcular progresso de algo que não pode mais ser confirmado) só mostra os dados estáticos. */
function GatilhosSecao({
  atletaId,
  contrato,
  gatilhos,
  progressoPorGatilho,
  competicoesDisponiveis,
  temJogosSemCompeticao,
  editavel,
}: {
  atletaId: string;
  contrato: ContratoRow;
  gatilhos: AtletaContratoGatilhoRow[];
  progressoPorGatilho: Record<string, ProgressoGatilho>;
  competicoesDisponiveis: CompeticaoDisponivelAtleta[];
  temJogosSemCompeticao: boolean;
  editavel: boolean;
}) {
  if (gatilhos.length === 0 && !editavel) return null;

  return (
    <div className="mt-3 border-t border-linha pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Gatilhos (bônus por meta)</p>
      {gatilhos.length > 0 ? (
        <ul className="mt-1.5 space-y-2">
          {gatilhos.map((g) => {
            const progresso = progressoPorGatilho[g.id];
            const metricaInfo = METRICA_GATILHO_OPTIONS.find((m) => m.value === g.metrica);
            const unidade = metricaInfo?.tipo === "contagem" ? "" : "%";
            return (
              <li key={g.id} className="rounded-md bg-white px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-neutral-600">
                    <span className="font-medium text-neutral-800">{metricaInfo?.label ?? g.metrica}</span> ≥{" "}
                    {g.limiar}
                    {unidade} → {formatMoeda(g.valor_bonus)}
                  </span>
                  {g.cumprida_em ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                      Confirmado em {formatData(g.cumprida_em)}
                    </span>
                  ) : progresso ? (
                    <span className="text-xs text-neutral-500">
                      Progresso: {progresso.atual.toFixed(1)}
                      {unidade} de {g.limiar}
                      {unidade}
                    </span>
                  ) : null}
                </div>
                {editavel && !g.cumprida_em ? (
                  <div className="mt-1.5 flex items-center gap-3">
                    {progresso?.atingida ? (
                      <form action={confirmarGatilhoContrato}>
                        <input type="hidden" name="id" value={g.id} />
                        <input type="hidden" name="atletaId" value={atletaId} />
                        <button type="submit" className="text-xs font-medium text-green-700 hover:underline">
                          Confirmar bônus
                        </button>
                      </form>
                    ) : null}
                    <form action={removerGatilhoContrato}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="atletaId" value={atletaId} />
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-700">
                        Remover
                      </button>
                    </form>
                  </div>
                ) : null}
                {g.cumprida_em && g.confirmada_por_nome ? (
                  <p className="mt-1 text-xs text-neutral-400">Confirmado por {g.confirmada_por_nome}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {editavel ? (
        <div className="mt-2">
          <GatilhoContratoForm
            action={criarGatilhoContrato}
            contratoId={contrato.id}
            atletaId={atletaId}
            competicoesDisponiveis={competicoesDisponiveis}
            temJogosSemCompeticao={temJogosSemCompeticao}
          />
        </div>
      ) : null}
    </div>
  );
}

function ContratoCard({
  atletaId,
  contrato,
  evolucoes,
  gatilhos,
  progressoPorGatilho,
  competicoesDisponiveis,
  temJogosSemCompeticao,
  tipoContratoLabel,
  hojeStr,
  destaque,
  vigenciaBidInicio,
  vigenciaBidFim,
}: {
  atletaId: string;
  contrato: ContratoRow;
  evolucoes: AtletaContratoEvolucaoSalarialRow[];
  gatilhos: AtletaContratoGatilhoRow[];
  progressoPorGatilho: Record<string, ProgressoGatilho>;
  competicoesDisponiveis: CompeticaoDisponivelAtleta[];
  temJogosSemCompeticao: boolean;
  tipoContratoLabel: Record<string, string>;
  hojeStr: string;
  destaque?: boolean;
  /** Vigência do BID (registro na CBF/FPF) — dado do ATLETA, não do contrato (ver `ContratoSecao`,
   * que repassa de `atletaCampos`); só faz sentido mostrar no card vigente (`destaque`), nunca num
   * card do histórico — é o período atual, não necessariamente o que valia quando aquele contrato
   * antigo estava ativo. Só usado quando `contrato.tipo_contrato === "formacao"` (ver abaixo). */
  vigenciaBidInicio?: string | null;
  vigenciaBidFim?: string | null;
}) {
  const rubricasBase = [
    { chave: "salario_ctps" as const, label: "Salário CTPS", valor: contrato.salario_ctps },
    { chave: "direito_imagem" as const, label: "Direito de imagem", valor: contrato.direito_imagem },
    { chave: "bonificacao" as const, label: "Bonificação", valor: contrato.bonificacao },
    { chave: "auxilio_moradia" as const, label: "Auxílio moradia", valor: contrato.auxilio_moradia },
    { chave: "outros" as const, label: "Outros", valor: contrato.outros },
  ];
  // Valor efetivo: a evolução salarial mais recente já aplicável pra cada rubrica, ou o valor
  // gravado no contrato quando não há nenhuma (ver `valorEfetivoRubrica`).
  const rubricas = rubricasBase.map((r) => ({
    ...r,
    valor: valorEfetivoRubrica(r.valor, evolucoes, r.chave, hojeStr),
  }));
  const total = rubricas.reduce((soma, r) => soma + r.valor, 0);
  const percentual = (valor: number) => (total > 0 ? `${((valor / total) * 100).toFixed(1)}%` : "—");
  const temRemuneracaoFormal = contratoTemRemuneracaoFormal(contrato.tipo_contrato);
  const restantes = destaque ? diasRestantesContrato(contrato.vigencia_fim, hojeStr) : null;
  // Sem nenhuma das duas datas, deixa o campo em branco em vez de escrever algo no lugar (pedido do
  // Mateus em 04/11/2026: "se não tem data, deixa em branco, não faz sentido"). Um contrato chega
  // aqui sem nenhuma data só quando tem valor de remuneração lançado — sem data E sem valor nenhum
  // já nem conta como o vigente (ver `contratoVazio`/filtro em `ContratoSecao`).
  const vigenciaTexto =
    contrato.vigencia_inicio || contrato.vigencia_fim
      ? `${formatData(contrato.vigencia_inicio)} – ${formatData(contrato.vigencia_fim)}`
      : "";
  // Vigência do BID + Bolsa de aprendizagem, só pra Formação (pedido do Mateus em 12/11/2026, ao
  // ver o card do contrato vigente sem essas duas informações — antes só apareciam no card/modal
  // próprio de "Contrato de Formação", que não existe mais como card separado — ver
  // `components/contrato-formacao-button.tsx`). BID só no vigente (ver o comentário da prop acima);
  // Bolsa de aprendizagem vem do próprio contrato, então aparece também no histórico.
  const bidTexto =
    destaque && (vigenciaBidInicio || vigenciaBidFim)
      ? `${formatData(vigenciaBidInicio ?? null)} – ${formatData(vigenciaBidFim ?? null)}`
      : "";

  return (
    <div className={`rounded-lg border p-4 ${destaque ? "border-grena bg-grena/5" : "border-linha bg-neutral-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-grena-escuro">
          {tipoContratoLabel[contrato.tipo_contrato] ?? contrato.tipo_contrato}
          {contrato.tipo_contrato === "emprestimo" && contrato.clube_origem ? ` — ${contrato.clube_origem}` : ""}
        </h3>
        <span className="text-sm text-neutral-500">
          {vigenciaTexto}
          {restantes
            ? `${vigenciaTexto ? " · " : ""}faltam ${restantes.dias} dias (≈ ${restantes.meses} ${restantes.meses === 1 ? "mês" : "meses"})`
            : destaque && !contrato.vigencia_fim
              ? vigenciaTexto
                ? " · sem prazo definido"
                : "Sem prazo definido"
              : ""}
        </span>
      </div>
      {temRemuneracaoFormal ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rubricas.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                <span className="text-neutral-600">{r.label}</span>
                <span className="font-medium text-neutral-800">
                  {formatMoeda(r.valor)} <span className="text-xs text-neutral-400">({percentual(r.valor)})</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-linha pt-3">
            <span className="text-sm font-semibold text-neutral-700">Valor total</span>
            <span className="text-base font-bold text-grena-escuro">{formatMoeda(total)}</span>
          </div>
        </>
      ) : null}
      {contrato.tipo_contrato === "formacao" ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {bidTexto ? (
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
              <span className="text-neutral-600">Vigência do BID</span>
              <span className="font-medium text-neutral-800">{bidTexto}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
            <span className="text-neutral-600">Bolsa de aprendizagem</span>
            <span className="font-medium text-neutral-800">{formatMoeda(contrato.bolsa_aprendizagem)}</span>
          </div>
        </div>
      ) : null}
      <DireitosEconomicos contrato={contrato} />
      <EvolucaoSalarialSecao atletaId={atletaId} contrato={contrato} evolucoes={evolucoes} editavel={Boolean(destaque)} />
      <GatilhosSecao
        atletaId={atletaId}
        contrato={contrato}
        gatilhos={gatilhos}
        progressoPorGatilho={progressoPorGatilho}
        competicoesDisponiveis={competicoesDisponiveis}
        temJogosSemCompeticao={temJogosSemCompeticao}
        editavel={Boolean(destaque)}
      />
      {contrato.criado_por_nome ? (
        <p className="mt-3 text-xs text-neutral-400">Lançado por {contrato.criado_por_nome}</p>
      ) : null}
    </div>
  );
}

/**
 * Bloco de Contrato (vigente + histórico + botões "Novo contrato"/"Aditivo") — compartilhado pelas
 * telas "Ver atleta" e "Editar atleta", Profissional e Base. Não é mais uma aba própria: o Mateus
 * pediu pra ficar visível direto nas duas telas em vez de precisar clicar numa aba separada (ver
 * conversa de 2026-10-16 depois do spec original). Histórico vem num `<details>` (sem JavaScript)
 * pra não poluir a tela quando o atleta já tem vários contratos antigos.
 *
 * Extensões de 04/11/2026 (ver docs/superpowers/specs/2026-11-04-contrato-atleta-extensoes-
 * design.md): selo de status, dias restantes, direitos econômicos, botão "Aditivo" e evolução
 * salarial (com aviso de "chegando" acima do card do vigente).
 *
 * `novoContratoHref` já inclui `?origem=ver` ou `?origem=editar` — é assim que a página de criar
 * contrato sabe pra qual tela voltar depois de salvar (ver `app/atletas/[id]/contrato/novo/page.tsx`).
 * `aditivoHref` é o mesmo link com `&modo=aditivo` — só aparece o botão quando existe vigente.
 *
 * `atletaCampos` alimenta o botão "Contrato de Formação" (ver `ContratoFormacaoButton`, abaixo) —
 * até 12/11/2026 essa parte era uma seção própria (`ContratoFormacaoSecao`) renderizada fora daqui,
 * nas duas páginas que usam `ContratoSecao`; virou um botão igual "Novo contrato"/"Aditivo", que
 * abre um modal (pedido do Mateus: "igual acontece quando vamos desativar um atleta"). O contrato
 * de Formação vigente (se houver) é achado aqui mesmo, a partir de `contratos` — não precisa vir
 * como prop separada.
 */
export function ContratoSecao({
  atletaId,
  contratos,
  evolucoes,
  gatilhos,
  progressoPorGatilho,
  competicoesDisponiveis,
  temJogosSemCompeticao,
  tipoContratoLabel,
  novoContratoHref,
  atletaCampos,
}: {
  atletaId: string;
  contratos: ContratoRow[];
  evolucoes: AtletaContratoEvolucaoSalarialRow[];
  gatilhos: AtletaContratoGatilhoRow[];
  /** Progresso já calculado (ver `calcularProgressoGatilho`) pra cada gatilho do contrato vigente —
   * chave é o `id` do gatilho. Contratos do histórico não entram aqui (ver `GatilhosSecao`). */
  progressoPorGatilho: Record<string, ProgressoGatilho>;
  competicoesDisponiveis: CompeticaoDisponivelAtleta[];
  temJogosSemCompeticao: boolean;
  tipoContratoLabel: Record<string, string>;
  novoContratoHref: string;
  atletaCampos: ContratoFormacaoAtletaCampos;
}) {
  const hojeStr = hojeBrasilia();
  // Contrato "vazio" (sem data nem valor nenhum, sobra da migração — ver `contratoVazio`) não conta
  // como o contrato vigente de verdade: tela mostra "Sem contrato" em vez do card sem nenhuma
  // informação (pedido do Mateus em 04/11/2026). O registro continua no banco com `vigente = true`
  // (por isso não entra no histórico, que filtra `!vigente`) — só não aparece em lugar nenhum até
  // ser substituído por um contrato de verdade.
  const vigenteBruto = contratos.find((c) => c.vigente);
  const vigente = vigenteBruto && !contratoVazio(vigenteBruto) ? vigenteBruto : undefined;
  const historico = contratos.filter((c) => !c.vigente);
  const status = statusContrato(vigente, hojeStr);
  const evolucoesDoVigente = vigente ? evolucoes.filter((e) => e.contrato_id === vigente.id) : [];
  const avisos = evolucoesProximas(evolucoesDoVigente, hojeStr);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="field-label">Contrato vigente</p>
          <SeloStatusContrato status={status.status} label={status.label} />
        </div>
        <div className="flex gap-2">
          <Link href={novoContratoHref} className="btn-secondary">
            Novo contrato
          </Link>
          {vigente ? (
            <Link href={`${novoContratoHref}&modo=aditivo`} className="btn-secondary">
              Aditivo
            </Link>
          ) : null}
          <ContratoFormacaoButton
            atletaId={atletaId}
            atleta={atletaCampos}
            contratoFormacao={contratos.find((c) => c.vigente && c.tipo_contrato === "formacao") ?? null}
          />
        </div>
      </div>

      {avisos.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {avisos.map((aviso, i) => (
            <p key={i} className="rounded-md bg-dourado/10 px-3 py-2 text-sm text-grena-escuro">
              Evolução salarial em {aviso.diasRestantes} {aviso.diasRestantes === 1 ? "dia" : "dias"}:{" "}
              <span className="font-semibold">{aviso.rubricaLabel}</span> passa a {formatMoeda(aviso.novoValor)}.
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-2">
        {vigente ? (
          <ContratoCard
            atletaId={atletaId}
            contrato={vigente}
            evolucoes={evolucoesDoVigente}
            gatilhos={gatilhos.filter((g) => g.contrato_id === vigente.id)}
            progressoPorGatilho={progressoPorGatilho}
            competicoesDisponiveis={competicoesDisponiveis}
            temJogosSemCompeticao={temJogosSemCompeticao}
            tipoContratoLabel={tipoContratoLabel}
            hojeStr={hojeStr}
            destaque
            vigenciaBidInicio={atletaCampos.vigenciaBidInicio}
            vigenciaBidFim={atletaCampos.vigenciaBidFim}
          />
        ) : (
          <p className="text-sm text-neutral-400">Nenhum contrato cadastrado ainda.</p>
        )}
      </div>
      {historico.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-grena">
            Ver histórico de contratos ({historico.length})
          </summary>
          <div className="mt-2 space-y-3">
            {historico.map((contrato) => (
              <ContratoCard
                key={contrato.id}
                atletaId={atletaId}
                contrato={contrato}
                evolucoes={evolucoes.filter((e) => e.contrato_id === contrato.id)}
                gatilhos={gatilhos.filter((g) => g.contrato_id === contrato.id)}
                progressoPorGatilho={{}}
                competicoesDisponiveis={[]}
                temJogosSemCompeticao={false}
                tipoContratoLabel={tipoContratoLabel}
                hojeStr={hojeStr}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
