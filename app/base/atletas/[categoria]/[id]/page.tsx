import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { ContatoEmergenciaForm } from "@/components/contato-emergencia-form";
import { ContratoSecao } from "@/components/contrato-secao";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type {
  AtletaBaseContatoEmergenciaRow,
  AtletaBaseContratoRow,
  AtletaBaseRow,
} from "@/lib/supabase/types";
import { AtletaBaseForm } from "../../atleta-base-form";
import {
  updateAtletaBase,
  deleteAtletaBase,
  adicionarContatoEmergenciaBase,
  removerContatoEmergenciaBase,
} from "../../actions";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

export default async function EditarAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();
  const [{ data }, { data: contatosData }, { data: contratosData }] = await Promise.all([
    supabase.from("atletas_base").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_base_contatos_emergencia")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("atleta_base_contratos")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!data) notFound();

  const atleta = data as AtletaBaseRow;
  const contatos = (contatosData ?? []) as AtletaBaseContatoEmergenciaRow[];
  const contratos = (contratosData ?? []) as AtletaBaseContratoRow[];
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);

  const defaultValues: Record<string, string> = {
    categoria: atleta.categoria,
    nomeCompleto: atleta.nome_completo,
    apelido: atleta.apelido ?? "",
    rg: atleta.rg ?? "",
    cpf: atleta.cpf ? formatCPF(atleta.cpf) : "",
    dataNascimento: atleta.data_nascimento ?? "",
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa?.toString() ?? "",
    numeroCbf: atleta.numero_cbf?.toString() ?? "",
    peDominante: atleta.pe_dominante ?? "",
    telefone: atleta.telefone ?? "",
    email: atleta.email ?? "",
    cidadeNatal: atleta.cidade_natal ?? "",
    ufNatal: atleta.uf_natal ?? "",
    enderecoAtual: atleta.endereco_atual ?? "",
    dataInicioClube: atleta.data_inicio_clube ?? "",
    empresarioNome: atleta.empresario_nome ?? "",
    empresarioTelefone: atleta.empresario_telefone ?? "",
    empresarioEmail: atleta.empresario_email ?? "",
    tamanhoUniforme: atleta.tamanho_uniforme ?? "",
    status: atleta.status,
    classificacao: atleta.classificacao ?? "",
    possuiAlergiaMedicamento: atleta.possui_alergia_medicamento ? "on" : "",
    alergiaMedicamentoQual: atleta.alergia_medicamento_qual ?? "",
    alojado: atleta.alojado ? "on" : "",
    valorAjudaCusto: atleta.valor_ajuda_custo != null ? String(atleta.valor_ajuda_custo) : "",
    agencia: atleta.agencia ?? "",
    maeNome: atleta.mae_nome ?? "",
    maeTelefone: atleta.mae_telefone ?? "",
    emailMae: atleta.email_mae ?? "",
    paiNome: atleta.pai_nome ?? "",
    paiTelefone: atleta.pai_telefone ?? "",
    emailPai: atleta.email_pai ?? "",
    escola: atleta.escola ?? "",
    cep: atleta.cep ?? "",
    logradouro: atleta.logradouro ?? "",
    numero: atleta.numero ?? "",
    complemento: atleta.complemento ?? "",
    bairro: atleta.bairro ?? "",
    cidade: atleta.cidade ?? "",
    uf: atleta.uf ?? "",
    origemCep: atleta.origem_cep ?? "",
    origemLogradouro: atleta.origem_logradouro ?? "",
    origemNumero: atleta.origem_numero ?? "",
    origemComplemento: atleta.origem_complemento ?? "",
    origemBairro: atleta.origem_bairro ?? "",
    origemCidade: atleta.origem_cidade ?? "",
    origemUf: atleta.origem_uf ?? "",
  };

  return (
    <AppShell departamento="futebol_base" breadcrumb="Editar atleta">
      <Link href={`/base/atletas/${params.categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar atleta</h1>
      <div className="mt-4">
        <AtletaBaseForm
          action={updateAtletaBase}
          entityId={atleta.id}
          defaultValues={defaultValues}
          fotoUrl={fotoUrl}
          submitLabel="Salvar alterações"
        />
      </div>

      {/* Contatos de emergência — ver comentário equivalente em `app/atletas/[id]/page.tsx`
          (Profissional). */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
          Em caso de emergência, avisar
        </h2>
        <div className="mt-3 space-y-2">
          {contatos.map((contato) => (
            <div
              key={contato.id}
              className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="min-w-[160px] flex-1 font-medium text-neutral-800">{contato.nome}</span>
              <span className="text-neutral-500">{contato.parentesco || "—"}</span>
              <span className="text-neutral-500">{contato.contato || "—"}</span>
              <DeleteButton action={removerContatoEmergenciaBase} id={contato.id} entityLabel="contato" />
            </div>
          ))}
          {contatos.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum contato de emergência cadastrado ainda.</p>
          ) : null}
        </div>
        <div className="mt-3">
          <ContatoEmergenciaForm
            action={adicionarContatoEmergenciaBase}
            camposExtras={{ atletaId: atleta.id, categoria: params.categoria }}
          />
        </div>
      </section>

      {/* Contrato deixou de ser uma aba própria em 2026-10-16 — ver comentário equivalente em
          `app/atletas/[id]/page.tsx` (Profissional). */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">Contrato</h2>
        <div className="mt-3">
          <ContratoSecao
            contratos={contratos}
            tipoContratoLabel={TIPO_CONTRATO_LABEL}
            novoContratoHref={`/base/atletas/${params.categoria}/${atleta.id}/contrato/novo?origem=editar`}
          />
        </div>
      </section>

      {/* Excluir saiu da listagem (o card virou só uma foto clicável, sem botões) — mesmo lugar que
          "Excluir" já ocupa no cadastro de Jogos: o fim do formulário de edição. */}
      <div className="mt-6 flex justify-end border-t border-linha pt-4">
        <DeleteButton errorAction={deleteAtletaBase} id={atleta.id} entityLabel="atleta" />
      </div>
    </AppShell>
  );
}
