import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { AtletaCardDados } from "@/components/atletas/atleta-card";
import type { AtletaBaseRow } from "@/lib/supabase/types";
import { AssistenciaSocialListagem } from "./assistencia-social-listagem";

export type AssistenciaSocialAtletaItem = AtletaCardDados & { href: string; categoria: string };

/**
 * Listagem de atletas da Base pro módulo Assistência Social — ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 1. Mesmo padrão visual/restrição de
 * dados da Fisioterapia (`app/departamento-medico/fisioterapia/page.tsx`): cards com dados básicos
 * (foto, nome, apelido, nascimento, posição), sem CPF nem contrato — aqui também sem `classificacao`
 * (G1/G2/G3 é avaliação técnica, não social) e sem indicador de "em tratamento" (não existe aqui).
 */
export default async function AssistenciaSocialListagemPage() {
  const supabase = createClient();

  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("*")
    .eq("ativo", true)
    .order("nome_completo", { ascending: true });

  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: AssistenciaSocialAtletaItem[] = atletas.map((atleta, i) => ({
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
    dispensado: atleta.status === "dispensado",
    ativo: true,
    categoria: atleta.categoria,
    href: `/base/assistencia-social/${atleta.id}`,
  }));

  return (
    <AppShell departamento="futebol_base" largura="total">
      <PageHeader title="Assistência Social" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Clique num atleta pra ver o histórico de atendimentos e registrar um novo.
      </p>

      <div className="mt-6">
        <AssistenciaSocialListagem atletas={itens} />
      </div>
    </AppShell>
  );
}
