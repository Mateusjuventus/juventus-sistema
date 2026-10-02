import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { podeVerCampoSensivel } from "@/lib/auth/role";
import type { ComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import { ComissaoBaseForm } from "../comissao-base-form";
import { updateComissaoBase } from "../actions";

export default async function EditarComissaoBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, podeVerSalario] = await Promise.all([
    supabase.from("comissao_tecnica_base").select("*").eq("id", params.id).single(),
    podeVerCampoSensivel(supabase, "salario"),
  ]);

  if (!data) notFound();

  const pessoa = data as ComissaoTecnicaBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, pessoa.foto_path);

  const defaultValues: Record<string, string> = {
    nomeCompleto: pessoa.nome_completo,
    apelido: pessoa.apelido ?? "",
    rg: pessoa.rg,
    cpf: formatCPF(pessoa.cpf),
    dataNascimento: pessoa.data_nascimento,
    funcao: pessoa.funcao,
    telefone: pessoa.telefone ?? "",
    email: pessoa.email ?? "",
    tipoContrato: pessoa.tipo_contrato ?? "",
    // Só preenche o valor pra quem pode ver o campo — ver docs/superpowers/specs/2026-10-02-
    // campos-sensiveis-e-atletas-por-categoria-design.md.
    valorSalario: podeVerSalario ? pessoa.valor_salario?.toString() ?? "" : "",
    dataInicio: pessoa.data_inicio ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/comissao-tecnica" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar — Comissão Técnica/Diretoria</h1>
      <div className="mt-4">
        <ComissaoBaseForm
          action={updateComissaoBase}
          entityId={pessoa.id}
          defaultValues={defaultValues}
          categoriasIniciais={pessoa.categorias}
          fotoUrl={fotoUrl}
          submitLabel="Salvar alterações"
          podeVerSalario={podeVerSalario}
        />
      </div>
    </AppShell>
  );
}
