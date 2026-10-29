import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { AtletaAtivoButton } from "@/components/atleta-ativo-button";
import { GerarFichaAtletaButton } from "@/components/atletas/gerar-ficha-atleta-button";
import { CAMPOS_FICHA_ATLETA_PROFISSIONAL, CAMPOS_FICHA_ATLETA_BASE } from "@/lib/futebol/ficha-atleta";
import { buscarCompeticoesDisponiveisAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { FieldGroup, FormSection } from "@/components/fields";
import { DetailField } from "@/components/detail-field";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { formatTelefone } from "@/lib/validation/telefone";
import { formatCEP } from "@/lib/validation/cep";
import { categoriaAtletaLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { badgeClassificacaoAtleta, classificacaoAtletaLabel } from "@/lib/futebol/classificacao-atleta";
import { cadastroIncompletoRapido } from "@/lib/futebol/campograma";
import { ContratoSecao } from "@/components/contrato-secao";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { alternarAtletaAtivo } from "../../actions";
import type { AtletaContatoEmergenciaRow, AtletaContratoRow, AtletaRow, AtletaStatus } from "@/lib/supabase/types";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

// Rótulos oficiais de Status — iguais pras duas categorias desde a unificação de 28/10/2026.
const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Liberado",
  transicao: "Transição",
  departamento_medico: "Departamento Médico",
  dispensado: "Dispensado",
};

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

/** Tabelas de Jogos/Convocação/Súmula usadas só pra listar as Competições disponíveis pro
 * checklist do botão "Gerar ficha" — continuam em dois conjuntos (Profissional sem sufixo, Base
 * com `_base`) porque Jogos/Convocação da Base ainda não passou pela unificação (fora do escopo
 * desta fase — ver docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md, "Fora de
 * escopo"). */
const TABELAS_JOGO_PROFISSIONAL = {
  jogos: "jogos",
  convocacoes: "convocacoes",
  convocacaoAtletas: "convocacao_atletas",
  sumulas: "sumulas",
  sumulaEventos: "sumula_eventos",
  competicaoJogos: "competicao_jogos",
  competicoes: "competicoes",
  temporadas: "temporadas",
};
const TABELAS_JOGO_BASE = {
  jogos: "jogos_base",
  convocacoes: "convocacoes_base",
  convocacaoAtletas: "convocacao_atletas_base",
  sumulas: "sumulas_base",
  sumulaEventos: "sumula_eventos_base",
  competicaoJogos: "competicao_jogos_base",
  competicoes: "competicoes_base",
  temporadas: "temporadas_base",
};

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

interface EnderecoEstruturado {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

function enderecoVazio(e: EnderecoEstruturado): boolean {
  return !e.logradouro && !e.numero && !e.complemento && !e.bairro && !e.cidade && !e.uf && !e.cep;
}

/** Compara campo a campo (vazio e null contam como iguais) — usado pra não repetir o endereço de
 * origem na tela quando é idêntico ao atual (pedido do Mateus em 2026-10-22: "quando o endereço de
 * origem for o mesmo atual, deixar que fique aparecendo somente 1"). */
function enderecosIguais(a: EnderecoEstruturado, b: EnderecoEstruturado): boolean {
  return (
    (a.logradouro ?? "") === (b.logradouro ?? "") &&
    (a.numero ?? "") === (b.numero ?? "") &&
    (a.complemento ?? "") === (b.complemento ?? "") &&
    (a.bairro ?? "") === (b.bairro ?? "") &&
    (a.cidade ?? "") === (b.cidade ?? "") &&
    (a.uf ?? "") === (b.uf ?? "") &&
    (a.cep ?? "") === (b.cep ?? "")
  );
}

/** Caixinha com borda pra separar visualmente sub-blocos dentro do mesmo card (ex.: Atual/Origem
 * dentro de "Endereço") — antes era só um texto pequeno acima do grupo de campos, o que o Mateus
 * achou confuso ("fica meio que tudo junto"). */
function BlocoDetalhe({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="mb-3 inline-block rounded-full bg-grena/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-grena-escuro">
        {titulo}
      </p>
      <FieldGroup>{children}</FieldGroup>
    </div>
  );
}

/** Atleta criado pela inclusão rápida do Campograma (ver docs/superpowers/specs/
 * 2026-09-02-campograma-edicao-rapida-design.md, seção 4) fica marcado assim até RG e CPF serem
 * preenchidos de verdade pelo formulário normal de edição — só acontece na Base (o Campograma não
 * existe pro Profissional). Desde 29/10/2026 `atletas.rg`/`cpf` nunca são `null` (a tabela unificada
 * não aceita), então a detecção passou a ser o placeholder gravado pela inclusão rápida — ver
 * `cadastroIncompletoRapido` em lib/futebol/campograma.ts. */
function cadastroIncompleto(atleta: Pick<AtletaRow, "rg">): boolean {
  return cadastroIncompletoRapido(atleta.rg);
}

/**
 * Aba "Dados Pessoais" do perfil do atleta — visualização somente leitura do cadastro, única pro
 * Futebol Profissional e pro Futebol de Base desde a unificação de 28/10/2026 (ver
 * docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md). As seções "Responsáveis" (mãe/
 * pai), "Alojamento e ajuda de custo", o badge de Classificação e o link do Relatório de Dispensa
 * só aparecem pra categorias da Base — o resto (Dados pessoais, Endereço, Contato de emergência,
 * Dados esportivos, Contrato) é igual pras duas. Ver `/atletas/[id]` para editar.
 */
export default async function VerAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("atletas").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const atleta = data as AtletaRow;
  const isBase = ehCategoriaBaseValida(atleta.categoria);

  const [{ data: contatosData }, { data: contratosData }, competicoesDisponiveisAtleta] = await Promise.all([
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
    buscarCompeticoesDisponiveisAtleta(supabase, isBase ? TABELAS_JOGO_BASE : TABELAS_JOGO_PROFISSIONAL),
  ]);

  const contatos = (contatosData ?? []) as AtletaContatoEmergenciaRow[];
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = isBase
    ? `${categoriaAtletaLabel(atleta.categoria)} · ${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`
    : `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  // Ficha/PDF e Relatório/PDF (deferidos — ver nota acima de `TABELAS_JOGO_*`) continuam nas rotas
  // antigas, separadas por categoria; aqui só montamos o caminho certo pra cada uma.
  const ficha = isBase
    ? { pdfHrefBase: `/base/atletas/${atleta.categoria}/${atleta.id}/ficha/pdf`, campos: CAMPOS_FICHA_ATLETA_BASE }
    : { pdfHrefBase: `/atletas/${atleta.id}/ficha/pdf`, campos: CAMPOS_FICHA_ATLETA_PROFISSIONAL };

  return (
    <AppShell departamento={isBase ? "futebol_base" : undefined} breadcrumb="Dados Pessoais">
      <AtletaTabs atletaId={atleta.id} active="dados-pessoais" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/atletas/${atleta.id}`}
        ativo={atleta.ativo}
        acoesExtra={
          <>
            <GerarFichaAtletaButton
              pdfHrefBase={ficha.pdfHrefBase}
              campos={ficha.campos}
              competicoesDisponiveis={competicoesDisponiveisAtleta.competicoes}
              temJogosSemCompeticao={competicoesDisponiveisAtleta.temJogosSemCompeticao}
            />
            <AtletaAtivoButton action={alternarAtletaAtivo} id={atleta.id} ativo={atleta.ativo} />
          </>
        }
      />

      {/* Classificação (G1/G2/G3), aviso de cadastro incompleto e o link do Relatório de Dispensa
          — só existem pra categorias da Base (dispensa formal continua restrita à Base, ver
          `AtletaRow.dispensa_*` em lib/supabase/types.ts). */}
      {isBase ? (
        <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Classificação:</span>
              {atleta.classificacao ? (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassificacaoAtleta(atleta.classificacao)}`}>
                  {classificacaoAtletaLabel(atleta.classificacao)}
                </span>
              ) : (
                <span className="text-sm text-neutral-400">Não classificado</span>
              )}
            </div>
            {cadastroIncompleto(atleta) ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Cadastro incompleto
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {atleta.dispensa_data ? (
              <span className="text-sm text-neutral-500">
                Relatório de dispensa gerado — dispensado em {formatData(atleta.dispensa_data)}
              </span>
            ) : null}
            <Link href={`/base/atletas/${atleta.categoria}/${atleta.id}/dispensa`} className="btn-secondary">
              {atleta.dispensa_data ? "Ver/editar relatório de dispensa" : "Gerar relatório de dispensa"}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        <FormSection title="Dados pessoais">
          <FieldGroup>
            <DetailField label="Nome completo" value={atleta.nome_completo} />
            <DetailField label="Apelido" value={atleta.apelido} />
            {/* Placeholder da inclusão rápida (ver `cadastroIncompleto` acima) não é um RG/CPF de
                verdade — mostra "Pendente" em vez do valor interno (id/dígitos sintéticos). */}
            <DetailField label="RG" value={cadastroIncompletoRapido(atleta.rg) ? "Pendente" : atleta.rg} />
            <DetailField
              label="CPF"
              value={cadastroIncompletoRapido(atleta.rg) ? "Pendente" : atleta.cpf ? formatCPF(atleta.cpf) : null}
            />
            <DetailField label="Data de nascimento" value={formatData(atleta.data_nascimento)} />
            <DetailField label="Naturalidade" value={atleta.cidade_natal} />
            <DetailField label="UF natal" value={atleta.uf_natal} />
            <DetailField label="Telefone" value={atleta.telefone ? formatTelefone(atleta.telefone) : null} />
            <DetailField label="Email" value={atleta.email} />
            <DetailField
              label="Possui alergia a algum medicamento"
              value={atleta.possui_alergia_medicamento ? "Sim" : "Não"}
            />
            {atleta.possui_alergia_medicamento ? (
              <DetailField label="Qual" value={atleta.alergia_medicamento_qual} />
            ) : null}
          </FieldGroup>
        </FormSection>

        <FormSection title="Endereço">
          <div className="space-y-4">
            <BlocoDetalhe titulo="Atual">
              {/* Campo antigo, de antes do endereço estruturado (CEP/logradouro/etc.) existir — o
                  formulário de editar não grava mais nele, só continua aqui pra não sumir com dados
                  de cadastros antigos que só têm esse texto livre preenchido. */}
              {atleta.endereco_atual ? (
                <div className="sm:col-span-2">
                  <DetailField label="Endereço atual (cadastro antigo)" value={atleta.endereco_atual} />
                </div>
              ) : null}
              <DetailField label="Logradouro" value={atleta.logradouro} />
              <DetailField label="Número" value={atleta.numero} />
              <DetailField label="Complemento" value={atleta.complemento} />
              <DetailField label="Bairro" value={atleta.bairro} />
              <DetailField label="Cidade" value={atleta.cidade} />
              <DetailField label="UF" value={atleta.uf} />
              <DetailField label="CEP" value={atleta.cep ? formatCEP(atleta.cep) : null} />
            </BlocoDetalhe>

            {!enderecoVazio(atleta) &&
            enderecosIguais(atleta, {
              logradouro: atleta.origem_logradouro,
              numero: atleta.origem_numero,
              complemento: atleta.origem_complemento,
              bairro: atleta.origem_bairro,
              cidade: atleta.origem_cidade,
              uf: atleta.origem_uf,
              cep: atleta.origem_cep,
            }) ? (
              <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                O endereço de origem é o mesmo do atual.
              </p>
            ) : (
              <BlocoDetalhe titulo="Origem">
                <DetailField label="Logradouro" value={atleta.origem_logradouro} />
                <DetailField label="Número" value={atleta.origem_numero} />
                <DetailField label="Complemento" value={atleta.origem_complemento} />
                <DetailField label="Bairro" value={atleta.origem_bairro} />
                <DetailField label="Cidade" value={atleta.origem_cidade} />
                <DetailField label="UF" value={atleta.origem_uf} />
                <DetailField label="CEP" value={atleta.origem_cep ? formatCEP(atleta.origem_cep) : null} />
              </BlocoDetalhe>
            )}
          </div>
        </FormSection>

        <FormSection title={isBase ? "Responsáveis e contato de emergência" : "Contato de emergência"}>
          <div className="space-y-4">
            {isBase ? (
              <BlocoDetalhe titulo="Responsáveis">
                <DetailField label="Nome da mãe" value={atleta.mae_nome} />
                <DetailField label="Telefone da mãe" value={atleta.mae_telefone ? formatTelefone(atleta.mae_telefone) : null} />
                <DetailField label="Email da mãe" value={atleta.email_mae} />
                <DetailField label="Nome do pai" value={atleta.pai_nome} />
                <DetailField label="Telefone do pai" value={atleta.pai_telefone ? formatTelefone(atleta.pai_telefone) : null} />
                <DetailField label="Email do pai" value={atleta.email_pai} />
              </BlocoDetalhe>
            ) : null}

            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="mb-3 inline-block rounded-full bg-grena/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-grena-escuro">
                Em caso de emergência, avisar
              </p>
              {contatos.length > 0 ? (
                <div className="space-y-2">
                  {contatos.map((contato) => (
                    <div key={contato.id} className="flex flex-wrap gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">
                      <span className="min-w-[160px] flex-1 font-medium text-neutral-800">{contato.nome}</span>
                      <span className="text-neutral-500">{contato.parentesco || "—"}</span>
                      <span className="text-neutral-500">{contato.contato || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Nenhum contato de emergência cadastrado ainda.</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection title="Dados esportivos">
          <FieldGroup>
            {isBase ? <DetailField label="Categoria" value={categoriaAtletaLabel(atleta.categoria)} /> : null}
            <DetailField label="Posição" value={atleta.posicao} />
            <DetailField label="Número da camisa" value={atleta.numero_camisa?.toString()} />
            <DetailField label="Número CBF" value={atleta.numero_cbf?.toString()} />
            <DetailField
              label="Pé dominante"
              value={atleta.pe_dominante ? PE_DOMINANTE_LABEL[atleta.pe_dominante] : null}
            />
            <DetailField label="Status" value={STATUS_LABEL[atleta.status]} />
            <DetailField label="Data de início no clube" value={formatData(atleta.data_inicio_clube)} />
            <DetailField label="Empresário/representante" value={atleta.empresario_nome} />
            <DetailField
              label="Telefone do empresário"
              value={atleta.empresario_telefone ? formatTelefone(atleta.empresario_telefone) : null}
            />
            <DetailField label="Email do empresário" value={atleta.empresario_email} />
            <DetailField label="Tamanho do uniforme" value={atleta.tamanho_uniforme} />
            {isBase ? <DetailField label="Agência" value={atleta.agencia} /> : null}
          </FieldGroup>
        </FormSection>

        {/* Contrato deixou de ser uma aba própria em 2026-10-16 (pedido do Mateus: "não pode ficar
            na primeira página?") — fica visível direto aqui e também na tela de Editar, pra poder
            lançar um novo contrato sem precisar entrar em edição. */}
        <FormSection title="Contrato">
          <ContratoSecao
            contratos={contratos}
            tipoContratoLabel={TIPO_CONTRATO_LABEL}
            novoContratoHref={`/atletas/${atleta.id}/contrato/novo?origem=ver`}
          />
        </FormSection>

        {isBase ? (
          <FormSection title="Alojamento e ajuda de custo">
            <FieldGroup>
              <DetailField label="Mora no alojamento do clube" value={atleta.alojado ? "Sim" : "Não"} />
              <DetailField
                label="Valor de ajuda de custo"
                value={atleta.valor_ajuda_custo != null ? `R$ ${atleta.valor_ajuda_custo.toFixed(2)}` : null}
              />
              <DetailField label="Escola" value={atleta.escola} />
            </FieldGroup>
          </FormSection>
        ) : null}
      </div>
    </AppShell>
  );
}
