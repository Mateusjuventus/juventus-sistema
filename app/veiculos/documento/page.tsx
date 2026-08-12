import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { JogoRow, VeiculoRow } from "@/lib/supabase/types";
import { DocumentoVeiculosForm, type JogoOpcao } from "./documento-form";

/** Tela de montagem do ofício de liberação de acesso — ver `documento-form.tsx`. */
export default async function DocumentoVeiculosPage() {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();

  const [{ data: veiculosData }, { data: jogosData }] = await Promise.all([
    supabase.from("veiculos").select("*").eq("ativo", true).order("nome", { ascending: true }),
    // Só jogos daqui pra frente: o ofício é sempre sobre um compromisso que ainda vai acontecer.
    supabase
      .from("jogos")
      .select("id, adversario_nome, competicao, data_jogo, horario, local_estadio, endereco, mandante")
      .gte("data_jogo", hojeStr)
      .order("data_jogo", { ascending: true })
      .limit(20),
  ]);

  const veiculos = (veiculosData ?? []) as VeiculoRow[];
  const jogos: JogoOpcao[] = (
    (jogosData ?? []) as Pick<
      JogoRow,
      "id" | "adversario_nome" | "competicao" | "data_jogo" | "horario" | "local_estadio" | "endereco" | "mandante"
    >[]
  ).map((j) => ({
    id: j.id,
    adversarioNome: j.adversario_nome,
    competicao: j.competicao,
    dataJogo: j.data_jogo,
    horario: j.horario,
    localEstadio: j.local_estadio,
    endereco: j.endereco,
    mandante: j.mandante,
  }));

  return (
    <AppShell>
      <Link href="/veiculos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Veículos / Placas
      </Link>
      <PageHeader title="Documento de Liberação de Acesso" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Escolha os veículos e para onde o ofício vai. O PDF abre em outra aba, pronto para encaminhar.
      </p>

      <DocumentoVeiculosForm veiculos={veiculos} jogos={jogos} />
    </AppShell>
  );
}
