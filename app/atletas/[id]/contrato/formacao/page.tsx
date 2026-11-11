import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContratoFormacaoForm } from "@/components/contrato-formacao-form";
import { createClient } from "@/lib/supabase/server";
import type { AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";
import { criarContratoFormacao, atualizarContratoFormacao } from "./actions";

/** Números/decimais de volta pra string (ou `undefined` quando `null`/zero) — mesmo princípio de
 * `app/atletas/[id]/contrato/novo/page.tsx`. */
function paraString(valor: number | null): string | undefined {
  return valor ? String(valor) : undefined;
}

/**
 * Tela própria de "Contrato de Formação" — ver docs/superpowers/specs/2026-11-11-contrato-
 * formacao-fase2-design.md. Sempre disponível (não depende do tipo de contrato vigente atual).
 * Um formulário só: cria (quando ainda não existe um vigente do tipo "formacao") ou edita no
 * mesmo registro (quando já existe). `origem` (query string, igual ao padrão de `contrato/novo`)
 * decide pra onde voltar depois de salvar.
 */
export default async function ContratoFormacaoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { origem?: string };
}) {
  const supabase = createClient();
  const [{ data: atletaData }, { data: contratoData }] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("atleta_contratos")
      .select("*")
      .eq("atleta_id", params.id)
      .eq("vigente", true)
      .eq("tipo_contrato", "formacao")
      .maybeSingle(),
  ]);
  if (!atletaData) notFound();

  const atleta = atletaData as AtletaRow;
  const contratoFormacao = contratoData as AtletaContratoRow | null;
  const modoEdicao = contratoFormacao !== null;

  const origem = searchParams.origem === "editar" ? "editar" : "ver";
  const voltarHref = origem === "editar" ? `/atletas/${params.id}` : `/atletas/${params.id}/ver`;

  const valoresIniciais: Record<string, string | undefined> = {
    maeNome: atleta.mae_nome ?? undefined,
    maeTelefone: atleta.mae_telefone ?? undefined,
    emailMae: atleta.email_mae ?? undefined,
    maeCpf: atleta.mae_cpf ?? undefined,
    paiNome: atleta.pai_nome ?? undefined,
    paiTelefone: atleta.pai_telefone ?? undefined,
    emailPai: atleta.email_pai ?? undefined,
    paiCpf: atleta.pai_cpf ?? undefined,
    vigenciaBidInicio: atleta.vigencia_bid_inicio ?? undefined,
    vigenciaBidFim: atleta.vigencia_bid_fim ?? undefined,
    vigenciaInicio: contratoFormacao?.vigencia_inicio ?? undefined,
    vigenciaFim: contratoFormacao?.vigencia_fim ?? undefined,
    bolsaAprendizagem: paraString(contratoFormacao?.bolsa_aprendizagem ?? null),
  };

  return (
    <AppShell breadcrumb="Contrato de Formação">
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Contrato de Formação</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {modoEdicao
          ? "Edita o contrato de Formação vigente — as alterações salvam direto neste registro, sem gerar histórico."
          : "Ao salvar, o contrato vigente atual (se existir) é encerrado automaticamente e este passa a ser o vigente, do tipo Formação."}
      </p>
      <div className="mt-4">
        <ContratoFormacaoForm
          action={modoEdicao ? atualizarContratoFormacao : criarContratoFormacao}
          atletaId={params.id}
          camposExtras={{ origem }}
          valoresIniciais={valoresIniciais}
          modoEdicao={modoEdicao}
          dataNascimentoAtleta={atleta.data_nascimento}
        />
      </div>
    </AppShell>
  );
}
