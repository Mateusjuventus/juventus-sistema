import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getFisioterapiaPodeEditar } from "@/lib/auth/role";
import type { AtletaCardDados } from "@/components/atletas/atleta-card";
import type { AtletaRow, FisioterapiaLesaoRow } from "@/lib/supabase/types";
import { FisioterapiaListagem } from "./fisioterapia-listagem";

export type FisioterapiaAtletaItem = AtletaCardDados & { href: string; emTratamento: boolean };

/**
 * Listagem de atletas da sub-área Fisioterapia (Departamento Médico, só Futebol Profissional) — ver
 * docs/superpowers/specs/2026-09-30-fisioterapia-design.md, seção 3. Cards com dados básicos (foto,
 * nome, apelido, nascimento, posição — nada de CPF/contrato), indicador de "em tratamento" (lesão
 * ativa) e busca por nome. Clicar no card é a única navegação daqui, direto pra ficha do atleta.
 */
export default async function FisioterapiaListagemPage() {
  const supabase = createClient();

  const [{ data: atletasData }, { data: lesoesAtivasData }, podeEditar] = await Promise.all([
    supabase
      .from("atletas")
      .select("*")
      .eq("ativo", true)
      .order("nome_completo", { ascending: true }),
    // `.not("data_inicio", "is", null)`: uma lesão do histórico importado (sem data, ver migração
    // 0115) também tem `data_fim` nulo, mas não é uma lesão ATIVA agora — sem esse filtro, todo
    // atleta com histórico importado ficava marcado como "em tratamento" (borda vermelha) por
    // engano.
    supabase.from("fisioterapia_lesoes").select("atleta_id").is("data_fim", null).not("data_inicio", "is", null),
    getFisioterapiaPodeEditar(supabase),
  ]);

  const atletas = (atletasData ?? []) as AtletaRow[];
  const idsEmTratamento = new Set(
    ((lesoesAtivasData ?? []) as Pick<FisioterapiaLesaoRow, "atleta_id">[]).map((l) => l.atleta_id),
  );

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: FisioterapiaAtletaItem[] = atletas.map((atleta, i) => ({
    id: atleta.id,
    nome: atleta.nome_completo,
    apelido: atleta.apelido,
    cpf: null,
    fotoUrl: fotoUrls[i],
    dataNascimento: atleta.data_nascimento,
    dataFimContrato: null,
    tipoContrato: null,
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa,
    dispensado: false,
    ativo: true,
    emTratamento: idsEmTratamento.has(atleta.id),
    href: `/departamento-medico/fisioterapia/${atleta.id}`,
  }));

  return (
    <AppShell largura="total">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* A tela-hub de Departamento Médico foi removida (ver docs/superpowers/specs/
            2026-10-01-departamento-medico-historico-status-design.md, seção 1) — "Fisioterapia"
            agora é acessada direto pela sidebar, então "Voltar" segue o mesmo padrão dos outros
            módulos de topo (ex.: Atletas, Financeiro): volta pro Início. */}
        <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
          ← Voltar
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href="/departamento-medico/fisioterapia/relatorio" className="btn-secondary btn-sm">
            Relatório geral
          </Link>
          <a
            href="/departamento-medico/fisioterapia/relatorio-completo/pdf"
            className="btn-secondary btn-sm"
            target="_blank"
          >
            Gerar todos os relatórios
          </a>
        </div>
      </div>
      <PageHeader title="Fisioterapia" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        {podeEditar
          ? "Clique num atleta para lançar lesões, queixas e atendimentos."
          : "Clique num atleta para ver o histórico de lesões, queixas e atendimentos."}
      </p>

      <div className="mt-6">
        <FisioterapiaListagem atletas={itens} podeEditar={podeEditar} />
      </div>
    </AppShell>
  );
}
