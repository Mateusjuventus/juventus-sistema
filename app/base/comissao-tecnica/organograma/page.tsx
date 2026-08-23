import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ComissaoTecnicaBaseTabs } from "@/components/comissao-tecnica-base-tabs";
import { OrganogramaEditor, type OrganogramaNoData, type PessoaComissao } from "@/components/organograma-editor";
import { createClient } from "@/lib/supabase/server";
import type { ComissaoTecnicaBaseRow, OrganogramaBaseRow } from "@/lib/supabase/types";
import { salvarNoOrganograma, moverNoOrganograma, excluirNoOrganograma } from "./actions";

/**
 * Organograma do Futebol de Base — sub-módulo de Comissão Técnica/Diretoria (ver
 * docs/superpowers/specs/2026-08-23-organograma-base-design.md). Estrutura própria (`organograma_base`),
 * cada caixa podendo se vincular a uma pessoa já cadastrada ou usar nome/cargo digitados na hora.
 */
export default async function OrganogramaBasePage() {
  const supabase = createClient();

  const [{ data: nosData }, { data: pessoasData }] = await Promise.all([
    supabase.from("organograma_base").select("*").order("ordem", { ascending: true }),
    supabase.from("comissao_tecnica_base").select("id, nome_completo, funcao").order("nome_completo", { ascending: true }),
  ]);

  const nosBrutos = (nosData ?? []) as OrganogramaBaseRow[];
  const pessoas = (pessoasData ?? []) as Pick<ComissaoTecnicaBaseRow, "id" | "nome_completo" | "funcao">[];
  const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));

  const nos: OrganogramaNoData[] = nosBrutos.map((n) => {
    const pessoa = n.comissao_tecnica_base_id ? pessoaPorId.get(n.comissao_tecnica_base_id) : undefined;
    const nomeExibido = pessoa?.nome_completo ?? n.nome ?? "???";
    const cargoExibido = pessoa?.funcao ?? n.cargo ?? "";
    return {
      id: n.id,
      comissaoTecnicaBaseId: n.comissao_tecnica_base_id,
      nome: n.nome,
      cargo: n.cargo,
      grupo: n.grupo,
      linha: n.linha,
      reportaPara: n.reporta_para,
      ordem: n.ordem,
      posX: n.pos_x,
      posY: n.pos_y,
      nomeExibido,
      cargoExibido,
      vaga: !pessoa && !n.nome,
    };
  });

  const pessoasComissao: PessoaComissao[] = pessoas.map((p) => ({
    id: p.id,
    nome: p.nome_completo,
    cargo: p.funcao,
  }));

  return (
    <AppShell departamento="futebol_base" largura="total">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Comissão Técnica / Diretoria" />
      <ComissaoTecnicaBaseTabs active="organograma" />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-neutral-500">
          Arraste as caixas pra organizar do seu jeito. Clique numa caixa pra editar, ou em &quot;+ Nova
          caixa&quot; pra adicionar alguém — vinculada a um cadastro da Comissão Técnica, ou preenchida
          na mão (Presidente, Diretor, vaga em aberto).
        </p>
        {nos.length > 0 ? (
          <a
            href="/base/comissao-tecnica/organograma/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary shrink-0"
          >
            Exportar PDF
          </a>
        ) : null}
      </div>

      <OrganogramaEditor
        nos={nos}
        pessoasComissao={pessoasComissao}
        salvarAction={salvarNoOrganograma}
        moverAction={moverNoOrganograma}
        excluirAction={excluirNoOrganograma}
      />
    </AppShell>
  );
}
