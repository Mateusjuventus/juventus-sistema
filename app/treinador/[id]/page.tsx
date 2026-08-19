import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";
import { salvarParecerCaptacao } from "../actions";
import { ParecerForm } from "./parecer-form";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formulário do Parecer Final — o Treinador só vê/preenche isto: as 4 notas, comentários e
 * veredito. Nada de telefone/endereço/mãe-pai/indicação — essa tela nunca teve esses campos (ver
 * "Por que a tela em si nunca teve os outros campos" na spec). Mesma dupla checagem de permissão
 * feita aqui e de novo dentro de `salvarParecerCaptacao`, já que Server Actions não devem confiar
 * só na tela que os chamou.
 */
export default async function ParecerCandidatoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) redirect("/treinador");

  const { data } = await supabase.from("captacao_base").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const candidato = data as CaptacaoBaseRow;

  if (!candidato.categoria || !categorias.includes(candidato.categoria) || candidato.status !== "avaliacao") {
    redirect("/treinador");
  }

  const action = salvarParecerCaptacao.bind(null, candidato.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/treinador" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="mt-2 text-center">
        <h1 className="font-display text-xl font-bold text-grena-escuro">{candidato.nome_completo}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {categoriaBaseLabel(candidato.categoria)} · {candidato.posicao ?? "posição não informada"} · Nascimento{" "}
          {formatDataBr(candidato.data_nascimento)}
        </p>
      </div>

      <div className="card mt-6 p-6">
        <ParecerForm action={action} />
      </div>
    </main>
  );
}
