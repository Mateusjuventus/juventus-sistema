import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSection, FieldGroup } from "@/components/fields";
import { DetailField } from "@/components/detail-field";
import { ComissaoAtivoButton } from "@/components/comissao-ativo-button";
import { GerarFichaComissaoButton } from "@/components/gerar-ficha-comissao-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { formatTelefone } from "@/lib/validation/telefone";
import { formatCEP } from "@/lib/validation/cep";
import { podeVerCampoSensivel, getDepartamentosPermitidos } from "@/lib/auth/role";
import { CATEGORIAS_COMISSAO_TECNICA } from "@/lib/auth/categorias-base";
import {
  COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS,
  SETOR_COMISSAO_TECNICA_OPTIONS,
} from "@/lib/validation/schemas";
import { alternarComissaoAtivo } from "../../actions";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS.map((o) => [o.value, o.label]),
);
const SETOR_LABEL: Record<string, string> = Object.fromEntries(
  SETOR_COMISSAO_TECNICA_OPTIONS.map((o) => [o.value, o.label]),
);

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Tela "Ver" da Comissão Técnica/Diretoria — pedido do Mateus em 14/11/2026 (item 8): a listagem
 * virou cards (ver `app/comissao-tecnica/page.tsx`), cada card abrindo esta tela em vez de ir direto
 * pro formulário de edição (mesmo padrão já usado pros atletas, `app/atletas/[id]/ver/page.tsx`,
 * mas bem mais simples — sem contrato/competições/anotações, que não existem aqui).
 */
export default async function VerComissaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, podeVerSalario, departamentosPermitidos] = await Promise.all([
    supabase.from("comissao_tecnica").select("*").eq("id", params.id).single(),
    podeVerCampoSensivel(supabase, "salario"),
    getDepartamentosPermitidos(supabase),
  ]);
  if (!data) notFound();

  const pessoa = data as ComissaoTecnicaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, pessoa.foto_path);
  const departamento =
    !departamentosPermitidos.includes("futebol_profissional") && departamentosPermitidos.includes("futebol_base")
      ? "futebol_base"
      : "futebol_profissional";

  const categoriasLabel = pessoa.categorias
    .map((c) => CATEGORIAS_COMISSAO_TECNICA.find((o) => o.value === c)?.label ?? c)
    .join(" · ");
  const endereco = [pessoa.logradouro, pessoa.numero, pessoa.complemento, pessoa.bairro, pessoa.cidade, pessoa.uf]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell departamento={departamento} breadcrumb="Comissão Técnica/Diretoria">
      <Link href="/comissao-tecnica" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt={pessoa.nome_completo} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-neutral-100" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-grena-escuro">
              {pessoa.apelido || pessoa.nome_completo}
              {pessoa.ativo ? null : (
                <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Inativo
                </span>
              )}
            </h1>
            <p className="text-sm text-neutral-500">
              {pessoa.funcao} {categoriasLabel ? `· ${categoriasLabel}` : ""}
              {pessoa.setor ? ` · ${SETOR_LABEL[pessoa.setor] ?? pessoa.setor}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ComissaoAtivoButton action={alternarComissaoAtivo} id={pessoa.id} ativo={pessoa.ativo} />
          <GerarFichaComissaoButton id={pessoa.id} />
          <Link href={`/comissao-tecnica/${pessoa.id}`} className="btn-primary">
            Editar
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <FormSection title="Dados pessoais">
          <FieldGroup>
            <DetailField label="Nome completo" value={pessoa.nome_completo} />
            <DetailField label="Apelido" value={pessoa.apelido} />
            <DetailField label="RG" value={pessoa.rg} />
            <DetailField label="CPF" value={formatCPF(pessoa.cpf)} />
            <DetailField label="Data de nascimento" value={formatData(pessoa.data_nascimento)} />
            <DetailField label="Telefone" value={pessoa.telefone ? formatTelefone(pessoa.telefone) : null} />
            <DetailField label="E-mail" value={pessoa.email} />
          </FieldGroup>
        </FormSection>

        <FormSection title="Endereço">
          <FieldGroup>
            <DetailField label="CEP" value={pessoa.cep ? formatCEP(pessoa.cep) : null} />
            <DetailField label="Endereço" value={endereco || null} />
          </FieldGroup>
        </FormSection>

        <FormSection title="Função">
          <FieldGroup>
            <DetailField label="Categoria(s)" value={categoriasLabel || null} />
            <DetailField label="Função/cargo" value={pessoa.funcao} />
            <DetailField
              label="Tipo de contrato"
              value={pessoa.tipo_contrato ? TIPO_CONTRATO_LABEL[pessoa.tipo_contrato] ?? pessoa.tipo_contrato : null}
            />
            <DetailField label="Setor" value={pessoa.setor ? SETOR_LABEL[pessoa.setor] ?? pessoa.setor : null} />
            <DetailField label="Quando iniciou" value={pessoa.data_inicio ? formatData(pessoa.data_inicio) : null} />
            {podeVerSalario ? (
              <DetailField
                label="Salário mensal"
                value={pessoa.valor_salario != null ? formatMoeda(pessoa.valor_salario) : null}
              />
            ) : null}
          </FieldGroup>
        </FormSection>

        {pessoa.tipo_contrato === "clt" ? (
          <FormSection title="Dados de pagamento (CLT)">
            <FieldGroup>
              <DetailField label="Chave PIX" value={pessoa.chave_pix} />
              <DetailField label="Banco" value={pessoa.banco} />
              <DetailField label="Agência" value={pessoa.agencia} />
              <DetailField label="Conta" value={pessoa.conta} />
            </FieldGroup>
          </FormSection>
        ) : null}

        {pessoa.tipo_contrato === "pj" ? (
          <FormSection title="Dados de pagamento (PJ)">
            <FieldGroup>
              <DetailField label="Nome da Empresa" value={pessoa.empresa_nome} />
              <DetailField label="CNPJ" value={pessoa.empresa_cnpj} />
              <DetailField label="Chave PIX da empresa" value={pessoa.empresa_chave_pix} />
            </FieldGroup>
          </FormSection>
        ) : null}
      </div>
    </AppShell>
  );
}
