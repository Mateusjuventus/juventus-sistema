import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";
import { AtletaBaseForm } from "../../atleta-base-form";
import { updateAtletaBase, deleteAtletaBase } from "../../actions";

export default async function EditarAtletaBasePage({
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
    numeroFpf: atleta.numero_fpf?.toString() ?? "",
    peDominante: atleta.pe_dominante ?? "",
    telefone: atleta.telefone ?? "",
    cidadeNatal: atleta.cidade_natal ?? "",
    ufNatal: atleta.uf_natal ?? "",
    enderecoAtual: atleta.endereco_atual ?? "",
    dataInicioClube: atleta.data_inicio_clube ?? "",
    dataInicioContrato: atleta.data_inicio_contrato ?? "",
    empresarioNome: atleta.empresario_nome ?? "",
    empresarioTelefone: atleta.empresario_telefone ?? "",
    status: atleta.status,
    dataFimContrato: atleta.data_fim_contrato ?? "",
    tipoContrato: atleta.tipo_contrato ?? "",
    classificacao: atleta.classificacao ?? "",
    possuiContratoFormacao: atleta.possui_contrato_formacao ? "on" : "",
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
    cep: atleta.cep ?? "",
    logradouro: atleta.logradouro ?? "",
    numero: atleta.numero ?? "",
    complemento: atleta.complemento ?? "",
    bairro: atleta.bairro ?? "",
    cidade: atleta.cidade ?? "",
    uf: atleta.uf ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
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
      {/* Excluir saiu da listagem (o card virou só uma foto clicável, sem botões) — mesmo lugar que
          "Excluir" já ocupa no cadastro de Jogos: o fim do formulário de edição. */}
      <div className="mt-6 flex justify-end border-t border-linha pt-4">
        <DeleteButton errorAction={deleteAtletaBase} id={atleta.id} entityLabel="atleta" />
      </div>
    </AppShell>
  );
}
