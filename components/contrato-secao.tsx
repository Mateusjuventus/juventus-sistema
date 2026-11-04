import Link from "next/link";
import type { AtletaContratoRow, AtletaContratoEvolucaoSalarialRow } from "@/lib/supabase/types";
import {
  contratoVazio,
  diasRestantesContrato,
  direitosEconomicos,
  evolucoesProximas,
  statusContrato,
  valorEfetivoRubrica,
} from "@/lib/futebol/contrato";
import { hojeBrasilia } from "@/lib/data-brasil";
import { RUBRICA_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { EvolucaoSalarialForm } from "@/components/evolucao-salarial-form";
import { removerEvolucaoSalarial, salvarEvolucaoSalarial } from "@/app/atletas/[id]/contrato/actions";

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
      {/* Explica o que a seção faz antes do mini-formulário — "Rubrica" sozinho (o nome técnico do
          campo no banco) confundiu o Mateus na primeira vez que viu a tela ("o que seria essa
          rubrica?"). Só aparece quando os controles de adicionar aparecem (contrato vigente). */}
      {editavel ? (
        <p className="mt-0.5 text-xs text-neutral-400">
          Já sabe que um valor do contrato vai mudar numa data futura (reajuste, fim de carência etc.)? Registre
          aqui pra não esquecer — o valor novo passa a valer automaticamente a partir da data marcada.
        </p>
      ) : null}
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

function ContratoCard({
  atletaId,
  contrato,
  evolucoes,
  tipoContratoLabel,
  hojeStr,
  destaque,
}: {
  atletaId: string;
  contrato: ContratoRow;
  evolucoes: AtletaContratoEvolucaoSalarialRow[];
  tipoContratoLabel: Record<string, string>;
  hojeStr: string;
  destaque?: boolean;
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
  const restantes = destaque ? diasRestantesContrato(contrato.vigencia_fim, hojeStr) : null;
  // Sem nenhuma das duas datas, deixa o campo em branco em vez de escrever algo no lugar (pedido do
  // Mateus em 04/11/2026: "se não tem data, deixa em branco, não faz sentido"). Um contrato chega
  // aqui sem nenhuma data só quando tem valor de remuneração lançado — sem data E sem valor nenhum
  // já nem conta como o vigente (ver `contratoVazio`/filtro em `ContratoSecao`).
  const vigenciaTexto =
    contrato.vigencia_inicio || contrato.vigencia_fim
      ? `${formatData(contrato.vigencia_inicio)} – ${formatData(contrato.vigencia_fim)}`
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
      <DireitosEconomicos contrato={contrato} />
      <EvolucaoSalarialSecao atletaId={atletaId} contrato={contrato} evolucoes={evolucoes} editavel={Boolean(destaque)} />
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
 */
export function ContratoSecao({
  atletaId,
  contratos,
  evolucoes,
  tipoContratoLabel,
  novoContratoHref,
}: {
  atletaId: string;
  contratos: ContratoRow[];
  evolucoes: AtletaContratoEvolucaoSalarialRow[];
  tipoContratoLabel: Record<string, string>;
  novoContratoHref: string;
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
            tipoContratoLabel={tipoContratoLabel}
            hojeStr={hojeStr}
            destaque
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
