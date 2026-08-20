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
    <div className="min-h-screen bg-pagina">
      <div className="bg-grena">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href="/treinador"
            className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-grena/10 text-sm font-bold text-grena-escuro">
            {candidato.numero}
          </span>
          <h1 className="mt-3 text-xl font-bold text-grena-escuro">{candidato.nome_completo}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {categoriaBaseLabel(candidato.categoria)} · {candidato.posicao ?? "posição não informada"} · Nascimento{" "}
            {formatDataBr(candidato.data_nascimento)}
          </p>
        </div>

        <div className="card mt-6 p-6">
          <ParecerForm action={action} />
        </div>
      </main>
    </div>
  );
}
