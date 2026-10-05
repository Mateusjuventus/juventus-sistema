import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { TemporadaBaseRow } from "@/lib/supabase/types";
import { criarCompeticaoBase } from "../actions";
import { CompeticaoFormBase } from "../competicao-form";

export default async function NovaCompeticaoBasePage() {
  const supabase = createClient();
  const { data } = await supabase.from("temporadas_base").select("*").order("nome", { ascending: false });
  const temporadas = (data ?? []) as TemporadaBaseRow[];

  return (
    <AppShell breadcrumb="Nova Competição">
      <Link href="/base/competicoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Competições
      </Link>

      {temporadas.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-neutral-500">
          Crie uma temporada primeiro, na tela de{" "}
          <Link href="/base/competicoes" className="font-medium text-grena hover:underline">
            Competições
          </Link>
          — toda competição pertence a uma temporada.
        </div>
      ) : (
        <CompeticaoFormBase temporadas={temporadas} action={criarCompeticaoBase} submitLabel="Salvar competição" />
      )}
    </AppShell>
  );
}
