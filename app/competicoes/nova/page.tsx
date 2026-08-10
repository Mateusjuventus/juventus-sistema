import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { TemporadaRow } from "@/lib/supabase/types";
import { criarCompeticao } from "../actions";
import { CompeticaoForm } from "../competicao-form";

export default async function NovaCompeticaoPage() {
  const supabase = createClient();
  const { data } = await supabase.from("temporadas").select("*").order("nome", { ascending: false });
  const temporadas = (data ?? []) as TemporadaRow[];

  return (
    <AppShell>
      <Link href="/competicoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Competições
      </Link>
      <PageHeader title="Nova Competição" />

      {temporadas.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-neutral-500">
          Crie uma temporada primeiro, na tela de{" "}
          <Link href="/competicoes" className="font-medium text-grena hover:underline">
            Competições
          </Link>
          — toda competição pertence a uma temporada.
        </div>
      ) : (
        <CompeticaoForm temporadas={temporadas} action={criarCompeticao} submitLabel="Salvar competição" />
      )}
    </AppShell>
  );
}
