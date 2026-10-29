import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { ContatoEmergenciaForm } from "@/components/contato-emergencia-form";
import { ContratoSecao } from "@/components/contrato-secao";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { cadastroIncompletoRapido } from "@/lib/futebol/campograma";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaContatoEmergenciaRow, AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";
import { AtletaForm } from "../atleta-form";
import { updateAtleta, deleteAtleta, adicionarContatoEmergencia, removerContatoEmergencia } from "../actions";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

/** Editar atleta — único pro Futebol Profissional e pro Futebol de Base desde a unificação de
 * 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md). Antes existiam
 * `app/atletas/[id]/page.tsx` e `app/base/atletas/[categoria]/[id]/page.tsx` — quase idênticos,
 * diferindo só nos campos extras da Base, já resolvidos dentro de `AtletaForm` (campos
 * condicionais por categoria). O rótulo de tipo de contrato usa a lista mais ampla (com
 * "Iniciação") pra cobrir contratos de qualquer categoria no histórico. */
export default async function EditarAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, { data: contatosData }, { data: contratosData }] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.id).single(),
    supabase
      .from("atleta_contatos_emergencia")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("atleta_contratos")
      .select("*")
      .eq("atleta_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!data) notFound();

  const atleta = data as AtletaRow;
  const contatos = (contatosData ?? []) as AtletaContatoEmergenciaRow[];
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const isBase = atleta.categoria !== "profissional";
  // Atleta criado pela inclusão rápida do Campograma chega aqui com RG/CPF "placeholder" (ver
  // `cadastroIncompletoRapido` em lib/futebol/campograma.ts) — o formulário começa com esses dois
  // campos vazios, nunca com o id/dígitos sintéticos internos, pra forçar o preenchimento de verdade
  // em vez de deixar passar sem querer.
  const rgCpfPendente = cadastroIncompletoRapido(atleta.rg);

  const defaultValues: Record<string, string> = {
    categoria: atleta.categoria,
    nomeCompleto: atleta.nome_completo,
    apelido: atleta.apelido ?? "",
    rg: rgCpfPendente ? "" : atleta.rg,
    cpf: rgCpfPendente ? "" : formatCPF(atleta.cpf),
    dataNascimento: atleta.data_nascimento,
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa?.toString() ?? "",
    numeroCbf: atleta.numero_cbf?.toString() ?? "",
    peDominante: atleta.pe_dominante ?? "",
    telefone: atleta.telefone ?? "",
    email: atleta.email ?? "",
    emailPai: atleta.email_pai ?? "",
    emailMae: atleta.email_mae ?? "",
    cidadeNatal: atleta.cidade_natal ?? "",
    ufNatal: atleta.uf_natal ?? "",
    enderecoAtual: atleta.endereco_atual ?? "",
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
    paiNome: atleta.pai_nome ?? "",
    paiTelefone: atleta.pai_telefone ?? "",
    escola: atleta.escola ?? "",
  };

  return (
    <AppShell departamento={isBase ? "futebol_base" : undefined} breadcrumb="Editar atleta">
      <Link href={`/atletas?categoria=${atleta.categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar atleta</h1>
      <div className="mt-4">
        <AtletaForm
          action={updateAtleta}
          entityId={atleta.id}
          defaultValues={defaultValues}
          fotoUrl={fotoUrl}
          submitLabel="Salvar alterações"
        />
      </div>

      {/* Contatos de emergência — lista própria (pode ter mais de um), fora do form principal do
          atleta, mesmo padrão já usado pra Documentação (add/remove direto, sem passar pelo submit
          do cadastro inteiro). Ver docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md. */}
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
              <DeleteButton action={removerContatoEmergencia} id={contato.id} entityLabel="contato" />
            </div>
          ))}
          {contatos.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum contato de emergência cadastrado ainda.</p>
          ) : null}
        </div>
        <div className="mt-3">
          <ContatoEmergenciaForm action={adicionarContatoEmergencia} camposExtras={{ atletaId: atleta.id }} />
        </div>
      </section>

      {/* Contrato deixou de ser uma aba própria em 2026-10-16 (pedido do Mateus pra poder lançar um
          contrato novo sem precisar entrar na tela de editar) — mas também aparece aqui, pra quem
          já está editando o cadastro não precisar sair pra "Ver atleta" só por causa disso. */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">Contrato</h2>
        <div className="mt-3">
          <ContratoSecao
            contratos={contratos}
            tipoContratoLabel={TIPO_CONTRATO_LABEL}
            novoContratoHref={`/atletas/${atleta.id}/contrato/novo?origem=editar`}
          />
        </div>
      </section>

      {/* Excluir saiu da listagem (o card virou só uma foto clicável, sem botões) — mesmo lugar que
          "Excluir" já ocupa no cadastro de Jogos e no de Atletas da Base. */}
      <div className="mt-6 flex justify-end border-t border-linha pt-4">
        <DeleteButton errorAction={deleteAtleta} id={atleta.id} entityLabel="atleta" />
      </div>
    </AppShell>
  );
}
