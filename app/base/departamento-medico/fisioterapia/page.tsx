import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getFisioterapiaPodeEditarBase, getCategoriasBasePermitidas } from "@/lib/auth/role";
import type { AtletaCardDados } from "@/components/atletas/atleta-card";
import type { AtletaBaseRow, CategoriaBase, FisioterapiaLesaoBaseRow } from "@/lib/supabase/types";
import { FisioterapiaListagemBase } from "./fisioterapia-listagem-base";

export type FisioterapiaAtletaItemBase = AtletaCardDados & {
  href: string;
  emTratamento: boolean;
  categoria: CategoriaBase;
};

/**
 * Listagem de atletas da sub-área Fisioterapia (Departamento Médico, Futebol de Base) — espelha
 * `app/departamento-medico/fisioterapia/page.tsx` (Profissional), com um filtro de categoria
 * adicional (Sub-20 a Sub-11), já que a Base tem muito mais atletas. Ver docs/superpowers/specs/
 * 2026-10-06-fisioterapia-base-design.md. Busca e categoria são filtradas no cliente (igual à
 * busca de hoje), sobre a lista já restrita, no servidor, às categorias que o usuário pode ver
 * (`getCategoriasBasePermitidas`) — nunca manda pro cliente dado de categoria fora do que ele tem
 * liberado.
 */
export default async function FisioterapiaListagemBasePage() {
  const supabase = createClient();

  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const [{ data: atletasData }, { data: lesoesAtivasData }, podeEditar] = await Promise.all([
    supabase
      .from("atletas_base")
      .select("*")
      .eq("ativo", true)
      .in("categoria", categoriasPermitidas)
      .order("nome_completo", { ascending: true }),
    // Mesmo filtro de `.not("data_inicio", "is", null)` do Profissional seria redundante aqui (a
    // Base não tem histórico importado, então `data_inicio` nunca é nulo numa lesão real), mas
    // mantido por paridade/segurança caso uma lesão seja lançada sem data no futuro.
    supabase
      .from("fisioterapia_lesoes_base")
      .select("atleta_id")
      .is("data_fim", null)
      .not("data_inicio", "is", null),
    getFisioterapiaPodeEditarBase(supabase),
  ]);

  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const idsEmTratamento = new Set(
    ((lesoesAtivasData ?? []) as Pick<FisioterapiaLesaoBaseRow, "atleta_id">[]).map((l) => l.atleta_id),
  );

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: FisioterapiaAtletaItemBase[] = atletas.map((atleta, i) => ({
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
    categoria: atleta.categoria,
    href: `/base/departamento-medico/fisioterapia/${atleta.id}`,
  }));

  return (
    <AppShell departamento="futebol_base" largura="total" breadcrumb="Fisioterapia">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/base/departamento-medico/fisioterapia/relatorio" className="btn-secondary btn-sm">
            Relatório geral
          </Link>
          <a
            href="/base/departamento-medico/fisioterapia/relatorio-completo/pdf"
            className="btn-secondary btn-sm"
            target="_blank"
          >
            Gerar todos os relatórios
          </a>
        </div>
      </div>
      <p className="mt-1 text-center text-sm text-neutral-500">
        {podeEditar
          ? "Clique num atleta para lançar lesões, queixas e atendimentos."
          : "Clique num atleta para ver o histórico de lesões, queixas e atendimentos."}
      </p>

      <div className="mt-6">
        <FisioterapiaListagemBase
          atletas={itens}
          podeEditar={podeEditar}
          categoriasPermitidas={categoriasPermitidas}
        />
      </div>
    </AppShell>
  );
}
