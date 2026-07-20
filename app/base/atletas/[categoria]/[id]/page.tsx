import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";
import { AtletaBaseForm } from "../../atleta-base-form";
import { updateAtletaBase } from "../../actions";

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
    rg: atleta.rg,
    cpf: formatCPF(atleta.cpf),
    dataNascimento: atleta.data_nascimento,
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa?.toString() ?? "",
    peDominante: atleta.pe_dominante ?? "",
    telefone: atleta.telefone ?? "",
    cidadeNatal: atleta.cidade_natal ?? "",
    ufNatal: atleta.uf_natal ?? "",
    enderecoAtual: atleta.endereco_atual ?? "",
    dataInicioClube: atleta.data_inicio_clube ?? "",
    empresarioNome: atleta.empresario_nome ?? "",
    status: atleta.status,
    dataFimContrato: atleta.data_fim_contrato ?? "",
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
    </AppShell>
  );
}
