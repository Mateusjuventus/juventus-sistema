import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import { ComissaoBaseForm } from "../../comissao-base-form";
import { updateComissaoBase } from "../../actions";

export default async function EditarComissaoBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();
  const { data } = await supabase
    .from("comissao_tecnica_base")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const pessoa = data as ComissaoTecnicaBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, pessoa.foto_path);

  const defaultValues: Record<string, string> = {
    categoria: pessoa.categoria,
    nomeCompleto: pessoa.nome_completo,
    apelido: pessoa.apelido ?? "",
    rg: pessoa.rg,
    cpf: formatCPF(pessoa.cpf),
    dataNascimento: pessoa.data_nascimento,
    funcao: pessoa.funcao,
    telefone: pessoa.telefone ?? "",
    email: pessoa.email ?? "",
    tipoQuartoPreferido: pessoa.tipo_quarto_preferido ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link
        href={`/base/comissao-tecnica/${params.categoria}`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar — Comissão Técnica/Diretoria</h1>
      <div className="mt-4">
        <ComissaoBaseForm
          action={updateComissaoBase}
          entityId={pessoa.id}
          defaultValues={defaultValues}
          fotoUrl={fotoUrl}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
