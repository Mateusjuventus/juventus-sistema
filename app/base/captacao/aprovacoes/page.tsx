import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";
import { AprovarInscricaoForm } from "./aprovar-inscricao-form";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Fila de quem se inscreveu pelo link público de Captação (`/inscricao-captacao-base`) e ainda não
 * foi decidido — status "inscricao". Aprovar aqui pede a Data de Início e manda pra "Em avaliação";
 * Recusar manda direto pra "Dispensado". Separado da lista principal (`/base/captacao`) pra não
 * misturar quem já está sendo avaliado com quem só acabou de se inscrever (ver a spec de 19/08).
 */
export default async function AprovacoesCaptacaoPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("captacao_base")
    .select("*")
    .eq("status", "inscricao")
    .order("created_at", { ascending: true });

  const inscricoes = (data ?? []) as CaptacaoBaseRow[];

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/captacao" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Captação/Avaliação
      </Link>
      <PageHeader title="Aprovações" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Quem se inscreveu pelo link público espera aqui. Aprovar pede a Data de Início e manda pra
        Em avaliação; Recusar manda direto pra Dispensado.
      </p>

      {error ? (
        <p className="card mt-4 p-6 text-center text-sm text-red-700">
          Não foi possível carregar a fila agora.
        </p>
      ) : inscricoes.length === 0 ? (
        <p className="card mt-4 p-6 text-center text-sm text-neutral-400">
          Nenhuma inscrição esperando aprovação no momento.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {inscricoes.map((c) => (
            <section key={c.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/base/captacao/${c.id}`} className="font-semibold text-grena hover:underline">
                    {c.nome_completo}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    Nascimento {formatDataBr(c.data_nascimento)} · {c.posicao ?? "posição não informada"}
                    {c.categoria ? ` · ${categoriaBaseLabel(c.categoria)}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "Cidade não informada"}
                    {c.indicacao ? ` · Indicação: ${c.indicacao}` : ""}
                    {c.telefone ? ` · Tel: ${c.telefone}` : ""}
                  </p>
                  {c.deseja_alojamento ? (
                    <p className="text-xs font-medium text-amber-700">Precisa de alojamento</p>
                  ) : null}
                </div>
              </div>
              <div className="border-t border-linha pt-3">
                <AprovarInscricaoForm candidatoId={c.id} />
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
