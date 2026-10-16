import Link from "next/link";
import type { AtletaBaseContratoRow, AtletaContratoRow } from "@/lib/supabase/types";

type ContratoRow = AtletaContratoRow | AtletaBaseContratoRow;

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ContratoCard({
  contrato,
  tipoContratoLabel,
  destaque,
}: {
  contrato: ContratoRow;
  tipoContratoLabel: Record<string, string>;
  destaque?: boolean;
}) {
  const total =
    contrato.salario_ctps +
    contrato.direito_imagem +
    contrato.bonificacao +
    contrato.auxilio_moradia +
    contrato.outros;
  const percentual = (valor: number) => (total > 0 ? `${((valor / total) * 100).toFixed(1)}%` : "—");

  const rubricas = [
    { label: "Salário CTPS", valor: contrato.salario_ctps },
    { label: "Direito de imagem", valor: contrato.direito_imagem },
    { label: "Bonificação", valor: contrato.bonificacao },
    { label: "Auxílio moradia", valor: contrato.auxilio_moradia },
    { label: "Outros", valor: contrato.outros },
  ];

  return (
    <div className={`rounded-lg border p-4 ${destaque ? "border-grena bg-grena/5" : "border-linha bg-neutral-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-grena-escuro">
          {tipoContratoLabel[contrato.tipo_contrato] ?? contrato.tipo_contrato}
          {contrato.tipo_contrato === "emprestimo" && contrato.clube_origem ? ` — ${contrato.clube_origem}` : ""}
        </h3>
        <span className="text-sm text-neutral-500">
          {formatData(contrato.vigencia_inicio)} – {formatData(contrato.vigencia_fim)}
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
      {contrato.criado_por_nome ? (
        <p className="mt-2 text-xs text-neutral-400">Lançado por {contrato.criado_por_nome}</p>
      ) : null}
    </div>
  );
}

/**
 * Bloco de Contrato (vigente + histórico + botão "Novo contrato") — compartilhado pelas telas "Ver
 * atleta" e "Editar atleta", Profissional e Base. Não é mais uma aba própria: o Mateus pediu pra
 * ficar visível direto nas duas telas em vez de precisar clicar numa aba separada (ver conversa de
 * 2026-10-16 depois do spec original). Histórico vem num `<details>` (sem JavaScript) pra não
 * poluir a tela quando o atleta já tem vários contratos antigos.
 *
 * `novoContratoHref` já inclui `?origem=ver` ou `?origem=editar` — é assim que a página de criar
 * contrato sabe pra qual tela voltar depois de salvar (ver `app/atletas/[id]/contrato/novo/page.tsx`).
 */
export function ContratoSecao({
  contratos,
  tipoContratoLabel,
  novoContratoHref,
}: {
  contratos: ContratoRow[];
  tipoContratoLabel: Record<string, string>;
  novoContratoHref: string;
}) {
  const vigente = contratos.find((c) => c.vigente);
  const historico = contratos.filter((c) => !c.vigente);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="field-label">Contrato vigente</p>
        <Link href={novoContratoHref} className="btn-secondary">
          Novo contrato
        </Link>
      </div>
      <div className="mt-2">
        {vigente ? (
          <ContratoCard contrato={vigente} tipoContratoLabel={tipoContratoLabel} destaque />
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
              <ContratoCard key={contrato.id} contrato={contrato} tipoContratoLabel={tipoContratoLabel} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
