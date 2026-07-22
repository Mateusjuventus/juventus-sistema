import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import type { AtletaRow } from "@/lib/supabase/types";
import { AtletaForm } from "../atleta-form";
import { updateAtleta } from "../actions";

export default async function EditarAtletaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("atletas").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const atleta = data as AtletaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);

  const defaultValues: Record<string, string> = {
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
    tipoContrato: atleta.tipo_contrato ?? "",
    possuiContratoFormacao: atleta.possui_contrato_formacao ? "on" : "",
  };

  return (
    <AppShell>
      <Link href="/atletas" className="text-sm font-medium text-grena hover:underline">
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
    </AppShell>
  );
}
