import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContratoForm } from "@/components/contrato-form";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ATLETA_TIPO_CONTRATO_OPTIONS, ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaContratoRow } from "@/lib/supabase/types";
import { criarContrato } from "../actions";

/** Números de volta pra string (ou `undefined` quando `null`/zero) — `defaultValue` dos campos do
 * formulário espera string, e 0 vira campo vazio em vez de "0" (mais limpo pra rubricas e
 * percentuais que normalmente não são preenchidos no Aditivo). */
function paraString(valor: number | null): string | undefined {
  return valor ? String(valor) : undefined;
}

/**
 * Formulário dedicado de "Novo contrato"/"Aditivo" — único pro Futebol Profissional e pro Futebol
 * de Base desde a unificação de 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-
 * atletas-design.md). A lista de opções de tipo de contrato continua diferente por categoria
 * (Iniciação só aparece pra Base, mesma distinção de sempre — ver `ATLETA_TIPO_CONTRATO_OPTIONS`/
 * `ATLETA_BASE_TIPO_CONTRATO_OPTIONS`), por isso a página busca a categoria do atleta primeiro.
 * Alcançado tanto pela tela "Ver atleta" quanto por "Editar atleta" (desde 2026-10-16 o Contrato
 * não é mais uma aba própria — ver `components/contrato-secao.tsx`), então `origem` (na query
 * string do link que trouxe até aqui) diz pra qual das duas a action deve redirecionar de volta
 * depois de salvar.
 *
 * `?modo=aditivo` (ver docs/superpowers/specs/2026-11-04-contrato-atleta-extensoes-design.md) —
 * busca o contrato vigente do atleta e pré-preenche o formulário com os dados dele, travando Tipo
 * de contrato em "Definitivo". Sem vigente pra buscar (link direto/desatualizado), cai de volta no
 * modo normal — o botão "Aditivo" em `ContratoSecao` só aparece quando já existe um vigente, então
 * isso não deveria acontecer na prática.
 */
export default async function NovoContratoAtletaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { origem?: string; modo?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("atletas")
    .select("categoria, data_nascimento")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) notFound();
  const atletaInfo = data as { categoria: string; data_nascimento: string | null };
  const isBase = ehCategoriaBaseValida(atletaInfo.categoria);

  const origem = searchParams.origem === "editar" ? "editar" : "ver";
  const voltarHref = origem === "editar" ? `/atletas/${params.id}` : `/atletas/${params.id}/ver`;

  let vigente: AtletaContratoRow | null = null;
  if (searchParams.modo === "aditivo") {
    const { data: vigenteData } = await supabase
      .from("atleta_contratos")
      .select("*")
      .eq("atleta_id", params.id)
      .eq("vigente", true)
      .maybeSingle();
    vigente = (vigenteData as AtletaContratoRow | null) ?? null;
  }
  const modoAditivo = vigente !== null;

  const valoresIniciais = vigente
    ? {
        clubeOrigem: vigente.clube_origem ?? undefined,
        vigenciaInicio: vigente.vigencia_inicio ?? undefined,
        vigenciaFim: vigente.vigencia_fim ?? undefined,
        salarioCtps: paraString(vigente.salario_ctps),
        direitoImagem: paraString(vigente.direito_imagem),
        bonificacao: paraString(vigente.bonificacao),
        auxilioMoradia: paraString(vigente.auxilio_moradia),
        outros: paraString(vigente.outros),
        direitoEconomicoJuventusPct: paraString(vigente.direito_economico_juventus_pct),
        direitoEconomicoAtletaPct: paraString(vigente.direito_economico_atleta_pct),
        direitoEconomicoTerceiroNome: vigente.direito_economico_terceiro_nome ?? undefined,
        direitoEconomicoTerceiroPct: paraString(vigente.direito_economico_terceiro_pct),
        bolsaAprendizagem: paraString(vigente.bolsa_aprendizagem),
      }
    : undefined;

  return (
    <AppShell breadcrumb={modoAditivo ? "Aditivo de contrato" : "Novo contrato"}>
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">
        {modoAditivo ? "Aditivo de contrato" : "Novo contrato"}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {modoAditivo
          ? "Já veio preenchido com o contrato vigente atual — edite só o que mudou (prazo e/ou valores). Ao salvar, o contrato atual é encerrado automaticamente e vira histórico."
          : "Ao salvar, o contrato vigente atual (se existir) é encerrado automaticamente e vira histórico."}
      </p>
      <div className="mt-4">
        <ContratoForm
          action={criarContrato}
          tipoContratoOptions={isBase ? ATLETA_BASE_TIPO_CONTRATO_OPTIONS : ATLETA_TIPO_CONTRATO_OPTIONS}
          camposExtras={{ atletaId: params.id, origem }}
          valoresIniciais={valoresIniciais}
          modoAditivo={modoAditivo}
          dataNascimentoAtleta={atletaInfo.data_nascimento}
        />
      </div>
    </AppShell>
  );
}
