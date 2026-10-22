import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { AtletaAtivoButton } from "@/components/atleta-ativo-button";
import { FieldGroup, FormSection } from "@/components/fields";
import { DetailField } from "@/components/detail-field";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ATLETA_STATUS_LABEL } from "@/lib/futebol/fisioterapia";
import { ContratoSecao } from "@/components/contrato-secao";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { alternarAtletaAtivo } from "../../actions";
import type { AtletaContatoEmergenciaRow, AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
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

/**
 * Aba "Dados Pessoais" do perfil do atleta — visualização somente leitura do cadastro (dados
 * pessoais incluindo endereço/alergia, e dados esportivos), pra consultar rápido sem abrir o
 * formulário de edição. Ver `/atletas/[id]` para editar, e `AtletaTabs` para as outras abas
 * (Documentação, Dados de Jogo). O botão Ativar/Desativar (ver 0098_atleta_ativo.sql) mora aqui,
 * no cabeçalho compartilhado (`AtletaPerfilHeader`).
 */
export default async function VerAtletaPage({ params }: { params: { id: string } }) {
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
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  return (
    <AppShell breadcrumb="Dados Pessoais">
      <AtletaTabs atletaId={atleta.id} active="dados-pessoais" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/atletas/${atleta.id}`}
        ativo={atleta.ativo}
        acoesExtra={<AtletaAtivoButton action={alternarAtletaAtivo} id={atleta.id} ativo={atleta.ativo} />}
      />

      <div className="mt-6 space-y-6">
        {/* Dados pessoais, Endereço e Contato de emergência viraram 3 cards separados em 2026-10-22
            (pedido do Mateus: a ficha estava "muito confusa, muito misturada" com tudo dentro de um
            card só) — mesmo padrão visual que Dados esportivos/Contrato já usavam. Nenhum campo
            mudou, só a organização. Espelha `app/base/atletas/[categoria]/[id]/ver/page.tsx` (lá
            tem também um bloco de "Responsáveis" — mãe/pai —, que não existe no Profissional). */}
        <FormSection title="Dados pessoais">
          <FieldGroup>
            <DetailField label="Nome completo" value={atleta.nome_completo} />
            <DetailField label="Apelido" value={atleta.apelido} />
            <DetailField label="RG" value={atleta.rg} />
            <DetailField label="CPF" value={formatCPF(atleta.cpf)} />
            <DetailField label="Data de nascimento" value={formatData(atleta.data_nascimento)} />
            <DetailField label="Naturalidade" value={atleta.cidade_natal} />
            <DetailField label="UF natal" value={atleta.uf_natal} />
            <DetailField label="Telefone" value={atleta.telefone} />
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
                  de cadastros antigos que só têm esse texto livre preenchido (ver
                  `AtletaRow.endereco_atual` em lib/supabase/types.ts). Escondido quando vazio, que é
                  o caso normal pra qualquer cadastro feito ou editado depois de 2026-09-10. */}
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
              <DetailField label="CEP" value={atleta.cep} />
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
                <DetailField label="CEP" value={atleta.origem_cep} />
              </BlocoDetalhe>
            )}
          </div>
        </FormSection>

        <FormSection title="Contato de emergência">
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
        </FormSection>

        <FormSection title="Dados esportivos">
          <FieldGroup>
            <DetailField label="Posição" value={atleta.posicao} />
            <DetailField label="Número da camisa" value={atleta.numero_camisa?.toString()} />
            <DetailField label="Número CBF" value={atleta.numero_cbf?.toString()} />
            <DetailField
              label="Pé dominante"
              value={atleta.pe_dominante ? PE_DOMINANTE_LABEL[atleta.pe_dominante] : null}
            />
            <DetailField label="Status" value={ATLETA_STATUS_LABEL[atleta.status]} />
            <DetailField label="Data de início no clube" value={formatData(atleta.data_inicio_clube)} />
            <DetailField label="Empresário/representante" value={atleta.empresario_nome} />
            <DetailField label="Telefone do empresário" value={atleta.empresario_telefone} />
            <DetailField label="Email do empresário" value={atleta.empresario_email} />
            <DetailField label="Tamanho do uniforme" value={atleta.tamanho_uniforme} />
          </FieldGroup>
        </FormSection>

        {/* Contrato deixou de ser uma aba própria em 2026-10-16 (pedido do Mateus: "não pode ficar
            na primeira página?" / "ao abrir o cartão do atleta... conseguir adicionar") — fica
            visível direto aqui e também na tela de Editar, pra poder lançar um novo contrato sem
            precisar entrar em edição. */}
        <FormSection title="Contrato">
          <ContratoSecao
            contratos={contratos}
            tipoContratoLabel={TIPO_CONTRATO_LABEL}
            novoContratoHref={`/atletas/${atleta.id}/contrato/novo?origem=ver`}
          />
        </FormSection>
      </div>
    </AppShell>
  );
}
