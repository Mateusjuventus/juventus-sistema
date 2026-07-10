import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";
import { ComissaoForm } from "../comissao-form";
import { updateComissao } from "../actions";

export default async function EditarComissaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("comissao_tecnica").select("*").eq("id", params.id).single();

  if (!data) notFound();

  const pessoa = data as ComissaoTecnicaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, pessoa.foto_path);

  const defaultValues: Record<string, string> = {
    nomeCompleto: pessoa.nome_completo,
    rg: pessoa.rg,
    cpf: formatCPF(pessoa.cpf),
    dataNascimento: pessoa.data_nascimento,
    funcao: pessoa.funcao,
    telefone: pessoa.telefone ?? "",
    email: pessoa.email ?? "",
    tipoQuartoPreferido: pessoa.tipo_quarto_preferido ?? "",
  };

  return (
    <AppShell>
      <Link href="/comissao-tecnica" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar — Comissão Técnica/Diretoria</h1>
      <div className="mt-4">
        <ComissaoForm
          action={updateComissao}
          entityId={pessoa.id}
          defaultValues={defaultValues}
          fotoUrl={fotoUrl}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
