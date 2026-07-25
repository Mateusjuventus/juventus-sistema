import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { AtletaRow, ComissaoTecnicaRow, JogoRow, StaffOperacionalComFuncaoRow } from "@/lib/supabase/types";
import { RelatorioAvulsoForm, type JogoOpcao, type PessoaSelecionavel } from "./relatorio-avulso-form";

/**
 * Relatório/lista avulsa (Futebol Profissional) — monta um PDF sob medida com atletas, comissão
 * técnica e/ou staff de qualquer cadastro (não só quem foi convocado pra um jogo específico), sem
 * depender de um jogo já registrado no sistema. Útil pra qualquer lista pontual que os documentos
 * fixos (Rooming List, Ônibus, Credenciamento, Presskit) não cobrem.
 */
export default async function RelatorioAvulsoPage() {
  const supabase = createClient();

  const [{ data: atletasData }, { data: comissaoData }, { data: staffData }, { data: jogosData }] =
    await Promise.all([
      supabase.from("atletas").select("id, nome_completo, posicao").order("nome_completo", { ascending: true }),
      supabase
        .from("comissao_tecnica")
        .select("id, nome_completo, funcao")
        .order("nome_completo", { ascending: true }),
      supabase
        .from("staff_operacional")
        .select("*, funcao:staff_funcoes_catalogo!staff_operacional_funcao_id_fkey(nome)")
        .eq("ativo", true)
        .order("nome_completo", { ascending: true }),
      supabase
        .from("jogos")
        .select("id, adversario_nome, competicao, data_jogo, horario, local_estadio")
        .order("data_jogo", { ascending: false }),
    ]);

  const atletas = (atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "posicao">[];
  const comissao = (comissaoData ?? []) as Pick<ComissaoTecnicaRow, "id" | "nome_completo" | "funcao">[];
  const staff = (staffData ?? []) as StaffOperacionalComFuncaoRow[];
  const jogos = (jogosData ?? []) as Pick<
    JogoRow,
    "id" | "adversario_nome" | "competicao" | "data_jogo" | "horario" | "local_estadio"
  >[];

  const jogosCadastrados: JogoOpcao[] = jogos.map((j) => {
    const [ano, mes, dia] = j.data_jogo.split("-");
    return {
      id: j.id,
      label: `${j.adversario_nome} — ${dia}/${mes}/${ano}`,
      adversario: j.adversario_nome,
      competicao: j.competicao,
      data: j.data_jogo,
      horario: j.horario ?? "",
      local: j.local_estadio ?? "",
    };
  });

  const atletasSelecionaveis: PessoaSelecionavel[] = atletas.map((a) => ({
    id: a.id,
    nome: a.nome_completo,
    extra: a.posicao,
  }));
  const comissaoSelecionavel: PessoaSelecionavel[] = comissao.map((c) => ({
    id: c.id,
    nome: c.nome_completo,
    extra: c.funcao,
  }));
  const staffSelecionavel: PessoaSelecionavel[] = staff.map((s) => ({
    id: s.id,
    nome: s.nome_completo,
    extra: s.funcao?.nome ?? "—",
  }));

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Relatório avulso</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Monte uma lista em PDF do seu jeito — escolha quem entra, quais dados aparecem e, se
        quiser, adicione informações de um jogo.
      </p>

      <div className="mt-4">
        <RelatorioAvulsoForm
          actionUrl="/relatorios/avulso/pdf"
          jogosCadastrados={jogosCadastrados}
          atletas={atletasSelecionaveis}
          comissao={comissaoSelecionavel}
          staff={staffSelecionavel}
        />
      </div>
    </AppShell>
  );
}
