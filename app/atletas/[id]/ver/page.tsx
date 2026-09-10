import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { AtletaAtivoButton } from "@/components/atleta-ativo-button";
import { FieldGroup, FormSection } from "@/components/fields";
import { DetailField } from "@/components/detail-field";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { alternarAtletaAtivo } from "../../actions";
import type { AtletaRow, AtletaStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
};

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
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
  const { data } = await supabase.from("atletas").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const atleta = data as AtletaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  return (
    <AppShell>
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
        {/* Endereço e "Possui alergia a algum medicamento" viraram parte deste card em vez de seção
            própria em 2026-09-10 (pedido do Mateus: "Endereço... fazem parte dos dados pessoais do
            atleta"; alergia já era assim no formulário de edição, só faltava aparecer aqui também).
            Endereço passou a ser estruturado (CEP/logradouro/etc., mesmo padrão da Base) no mesmo
            dia (pedido do Mateus: "no profissional, deva ter todos os dados do endereço"). */}
        <FormSection title="Dados pessoais">
          <FieldGroup>
            <DetailField label="Nome completo" value={atleta.nome_completo} />
            <DetailField label="Apelido" value={atleta.apelido} />
            <DetailField label="RG" value={atleta.rg} />
            <DetailField label="CPF" value={formatCPF(atleta.cpf)} />
            <DetailField label="Data de nascimento" value={formatData(atleta.data_nascimento)} />
            <DetailField label="Telefone" value={atleta.telefone} />
            <DetailField
              label="Possui alergia a algum medicamento"
              value={atleta.possui_alergia_medicamento ? "Sim" : "Não"}
            />
            {atleta.possui_alergia_medicamento ? (
              <DetailField label="Qual" value={atleta.alergia_medicamento_qual} />
            ) : null}
            <DetailField label="Naturalidade" value={atleta.cidade_natal} />
            <DetailField label="UF natal" value={atleta.uf_natal} />
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
          </FieldGroup>
        </FormSection>

        <FormSection title="Dados esportivos">
          <FieldGroup>
            <DetailField label="Posição" value={atleta.posicao} />
            <DetailField label="Número da camisa" value={atleta.numero_camisa?.toString()} />
            <DetailField label="Número CBF" value={atleta.numero_cbf?.toString()} />
            <DetailField label="Número FPF" value={atleta.numero_fpf?.toString()} />
            <DetailField
              label="Pé dominante"
              value={atleta.pe_dominante ? PE_DOMINANTE_LABEL[atleta.pe_dominante] : null}
            />
            <DetailField label="Status" value={STATUS_LABEL[atleta.status]} />
            <DetailField
              label="Tipo de contrato"
              value={atleta.tipo_contrato ? TIPO_CONTRATO_LABEL[atleta.tipo_contrato] : null}
            />
            {atleta.tipo_contrato === "amador" ? (
              <DetailField
                label="Possui contrato de formação"
                value={atleta.possui_contrato_formacao ? "Sim" : "Não"}
              />
            ) : null}
            <DetailField label="Data de início no clube" value={formatData(atleta.data_inicio_clube)} />
            <DetailField label="Data de término do contrato" value={formatData(atleta.data_fim_contrato)} />
            <DetailField label="Empresário/representante" value={atleta.empresario_nome} />
          </FieldGroup>
        </FormSection>
      </div>
    </AppShell>
  );
}
