import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabsBase } from "@/components/atleta-tabs-base";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { FieldGroup, FormSection } from "@/components/fields";
import { DetailField } from "@/components/detail-field";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { badgeClassificacaoAtleta, classificacaoAtletaLabel } from "@/lib/futebol/classificacao-atleta";
import type { AtletaBaseRow, AtletaBaseStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<AtletaBaseStatus, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
  dispensado: "Dispensado",
};

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Espelha `app/atletas/[id]/ver/page.tsx` para o Futebol de Base. */
export default async function VerAtletaBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();
  const { data } = await supabase.from("atletas_base").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const atleta = data as AtletaBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  return (
    <AppShell departamento="futebol_base">
      <AtletaTabsBase categoria={params.categoria} atletaId={atleta.id} active="dados-pessoais" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/base/atletas/${params.categoria}/${atleta.id}`}
      />

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
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
        <div className="flex items-center gap-3">
          {atleta.dispensa_data ? (
            <span className="text-sm text-neutral-500">
              Relatório de dispensa gerado — dispensado em {formatData(atleta.dispensa_data)}
            </span>
          ) : null}
          <Link href={`/base/atletas/${params.categoria}/${atleta.id}/dispensa`} className="btn-secondary">
            {atleta.dispensa_data ? "Ver/editar relatório de dispensa" : "Gerar relatório de dispensa"}
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <FormSection title="Dados pessoais">
          <FieldGroup>
            <DetailField label="Nome completo" value={atleta.nome_completo} />
            <DetailField label="Apelido" value={atleta.apelido} />
            <DetailField label="RG" value={atleta.rg} />
            <DetailField label="CPF" value={atleta.cpf ? formatCPF(atleta.cpf) : null} />
            <DetailField label="Data de nascimento" value={formatData(atleta.data_nascimento)} />
            <DetailField label="Telefone" value={atleta.telefone} />
          </FieldGroup>
        </FormSection>

        <FormSection title="Dados esportivos">
          <FieldGroup>
            <DetailField label="Categoria" value={categoriaBaseLabel(atleta.categoria)} />
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
            <DetailField label="Telefone do empresário" value={atleta.empresario_telefone} />
          </FieldGroup>
        </FormSection>

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

        <FormSection title="Responsáveis">
          <FieldGroup>
            <DetailField label="Nome da mãe" value={atleta.mae_nome} />
            <DetailField label="Telefone da mãe" value={atleta.mae_telefone} />
            <DetailField label="Nome do pai" value={atleta.pai_nome} />
            <DetailField label="Telefone do pai" value={atleta.pai_telefone} />
          </FieldGroup>
        </FormSection>

        <FormSection title="Naturalidade e endereço">
          <FieldGroup>
            <DetailField label="Cidade natal" value={atleta.cidade_natal} />
            <DetailField label="UF natal" value={atleta.uf_natal} />
            {/* Campo antigo, de antes do endereço estruturado (CEP/logradouro/etc.) existir — o
                formulário de editar não grava mais nele, só continua aqui pra não sumir com dados
                de cadastros antigos que só têm esse texto livre preenchido (ver
                `AtletaBaseRow.endereco_atual` em lib/supabase/types.ts). Escondido quando vazio,
                que é o caso normal pra qualquer cadastro feito depois do endereço estruturado. */}
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
      </div>
    </AppShell>
  );
}
