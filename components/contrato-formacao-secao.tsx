import Link from "next/link";
import type { AtletaContratoRow } from "@/lib/supabase/types";
import { formatTelefone } from "@/lib/validation/telefone";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Campos do atleta usados no resumo do card — não precisa do `AtletaRow` inteiro. */
export interface ContratoFormacaoAtletaCampos {
  maeNome: string | null;
  maeTelefone: string | null;
  paiNome: string | null;
  paiTelefone: string | null;
  vigenciaBidInicio: string | null;
  vigenciaBidFim: string | null;
}

/**
 * Card próprio do "Contrato de Formação" — ver docs/superpowers/specs/2026-11-11-contrato-
 * formacao-fase2-design.md. Sempre aparece, independente do tipo de contrato vigente do atleta
 * (diferente de `ContratoSecao`, cujo botão "Baixar Contrato de Formação" foi removido em favor
 * deste card). Dois estados: sem contrato de Formação vigente (convite pra criar) ou com (resumo +
 * baixar PDF + editar).
 *
 * `origem` decide a query string do link pra tela de Contrato de Formação saber pra onde voltar
 * depois de salvar (mesmo padrão de `novoContratoHref` em `ContratoSecao`).
 */
export function ContratoFormacaoSecao({
  atletaId,
  atleta,
  contratoFormacao,
  origem,
}: {
  atletaId: string;
  atleta: ContratoFormacaoAtletaCampos;
  contratoFormacao: AtletaContratoRow | null;
  origem: "ver" | "editar";
}) {
  const telaHref = `/atletas/${atletaId}/contrato/formacao?origem=${origem}`;

  if (!contratoFormacao) {
    return (
      <div className="rounded-lg border border-linha bg-neutral-50 p-4">
        <p className="text-sm text-neutral-400">Nenhum contrato de Formação vigente.</p>
        <div className="mt-3">
          <Link href={telaHref} className="btn-secondary">
            Criar contrato de Formação
          </Link>
        </div>
      </div>
    );
  }

  const vigenciaTexto =
    contratoFormacao.vigencia_inicio || contratoFormacao.vigencia_fim
      ? `${formatData(contratoFormacao.vigencia_inicio)} – ${formatData(contratoFormacao.vigencia_fim)}`
      : "—";
  const bidTexto =
    atleta.vigenciaBidInicio || atleta.vigenciaBidFim
      ? `${formatData(atleta.vigenciaBidInicio)} – ${formatData(atleta.vigenciaBidFim)}`
      : "—";

  return (
    <div className="rounded-lg border border-grena bg-grena/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-neutral-500">Vigência do Contrato de Formação: {vigenciaTexto}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
          <span className="text-neutral-600">Vigência do BID</span>
          <span className="font-medium text-neutral-800">{bidTexto}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
          <span className="text-neutral-600">Bolsa de aprendizagem</span>
          <span className="font-medium text-neutral-800">{formatMoeda(contratoFormacao.bolsa_aprendizagem)}</span>
        </div>
      </div>
      {atleta.maeNome || atleta.paiNome ? (
        <div className="mt-3 border-t border-linha pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Responsáveis</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {atleta.maeNome ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
                Mãe: {atleta.maeNome}
                {atleta.maeTelefone ? ` — ${formatTelefone(atleta.maeTelefone)}` : ""}
              </span>
            ) : null}
            {atleta.paiNome ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
                Pai: {atleta.paiNome}
                {atleta.paiTelefone ? ` — ${formatTelefone(atleta.paiTelefone)}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex gap-2 border-t border-linha pt-3">
        <Link href={`/atletas/${atletaId}/contrato/formacao/pdf`} className="btn-secondary" target="_blank">
          Baixar Contrato de Formação
        </Link>
        <Link href={telaHref} className="btn-secondary">
          Editar
        </Link>
      </div>
    </div>
  );
}
