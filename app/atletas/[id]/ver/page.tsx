import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FieldGroup, FormSection } from "@/components/fields";
import { DetailField } from "@/components/detail-field";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
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
 * Visualização somente leitura do cadastro de um atleta — pra consultar os dados rapidamente sem
 * precisar abrir o formulário de edição (ver `/atletas/[id]` para editar).
 */
export default async function VerAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("atletas").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const atleta = data as AtletaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);

  return (
    <AppShell>
      <Link href="/atletas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">{atleta.nome_completo}</h1>
        <Link href={`/atletas/${atleta.id}`} className="btn-primary">
          Editar
        </Link>
      </div>

      <div className="mt-4 space-y-6">
        <div className="card flex items-center gap-4 p-5">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoUrl}
              alt={atleta.nome_completo}
              className="h-24 w-24 flex-shrink-0 rounded-full object-cover ring-2 ring-neutral-100"
            />
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-2xl font-bold text-neutral-400">
              {atleta.nome_completo.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-neutral-800">{atleta.nome_completo}</p>
            {atleta.apelido ? (
              <p className="text-sm text-neutral-500">&ldquo;{atleta.apelido}&rdquo;</p>
            ) : null}
            <p className="mt-1 text-sm text-neutral-500">
              {atleta.posicao}
              {atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}
            </p>
          </div>
        </div>

        <FormSection title="Dados pessoais">
          <FieldGroup>
            <DetailField label="Nome completo" value={atleta.nome_completo} />
            <DetailField label="Apelido" value={atleta.apelido} />
            <DetailField label="RG" value={atleta.rg} />
            <DetailField label="CPF" value={formatCPF(atleta.cpf)} />
            <DetailField label="Data de nascimento" value={formatData(atleta.data_nascimento)} />
            <DetailField label="Telefone" value={atleta.telefone} />
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

        <FormSection title="Naturalidade e endereço">
          <FieldGroup>
            <DetailField label="Cidade natal" value={atleta.cidade_natal} />
            <DetailField label="UF natal" value={atleta.uf_natal} />
            <div className="sm:col-span-2">
              <DetailField label="Endereço atual" value={atleta.endereco_atual} />
            </div>
          </FieldGroup>
        </FormSection>
      </div>
    </AppShell>
  );
}
