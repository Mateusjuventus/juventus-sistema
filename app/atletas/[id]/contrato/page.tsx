import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Um card de contrato (vigente ou histórico) — rubricas em R$ com o percentual de cada uma sobre
 * o valor total (só exibição, não é um campo salvo — ver a spec). */
function ContratoCard({ contrato, destaque }: { contrato: AtletaContratoRow; destaque?: boolean }) {
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
          {TIPO_CONTRATO_LABEL[contrato.tipo_contrato] ?? contrato.tipo_contrato}
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

/** Aba "Contrato" do perfil do atleta — contrato vigente + histórico, somente leitura. "Novo
 * contrato" leva pra `.../contrato/novo`, que é quem efetivamente grava. Ver
 * docs/superpowers/specs/2026-10-16-atleta-dados-esportivos-contrato-design.md. */
export default async function ContratoAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: atletaData }, { data: contratosData }] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_contratos")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!atletaData) notFound();

  const atleta = atletaData as AtletaRow;
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const vigente = contratos.find((c) => c.vigente);
  const historico = contratos.filter((c) => !c.vigente);
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  return (
    <AppShell breadcrumb="Contrato">
      <AtletaTabs atletaId={atleta.id} active="contrato" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/atletas/${atleta.id}`}
        ativo={atleta.ativo}
      />

      <div className="mt-6 space-y-6">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">Contrato vigente</h2>
            <Link href={`/atletas/${atleta.id}/contrato/novo`} className="btn-secondary">
              Novo contrato
            </Link>
          </div>
          <div className="mt-3">
            {vigente ? (
              <ContratoCard contrato={vigente} destaque />
            ) : (
              <p className="text-sm text-neutral-400">Nenhum contrato cadastrado ainda.</p>
            )}
          </div>
        </section>

        {historico.length > 0 ? (
          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">Histórico</h2>
            <div className="mt-3 space-y-3">
              {historico.map((contrato) => (
                <ContratoCard key={contrato.id} contrato={contrato} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
