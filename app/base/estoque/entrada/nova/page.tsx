import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";
import { createEntradaBase } from "../../actions";
import { EntradaFormBase } from "../entrada-form";

export default async function NovaEntradaBasePage() {
  const supabase = createClient();
  const { data } = await supabase.from("estoque_itens_base").select("*").order("nome", { ascending: true });
  const itens = (data ?? []) as EstoqueItemBaseRow[];

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/estoque" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova Entrada — Estoque</h1>

      {itens.length === 0 ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ainda não há nenhum item cadastrado neste estoque.{" "}
          <Link href="/base/estoque/itens/novo" className="font-semibold underline">
            Cadastre um item primeiro
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6">
          <EntradaFormBase action={createEntradaBase} itens={itens} />
        </div>
      )}
    </AppShell>
  );
}
