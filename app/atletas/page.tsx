import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AtletasResumoFiltros, type AtletaResumoItem, type StatusFiltroOpcao } from "@/components/atletas/atletas-resumo-filtros";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { AtletaRow, AtletaStatus } from "@/lib/supabase/types";

// Rótulos "Apto"/"Não apto"/"Depto. Médico" (em vez de Liberado/Suspenso/Departamento Médico) —
// pedido do Mateus pra bater com o layout antigo de antes do redesign (ver item 7 do ajuste de
// 2026-09-10). O valor gravado no banco continua "liberado"/"suspenso"/"departamento_medico"; só o
// rótulo exibido nos chips de Status muda.
const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
};

const STATUS_OPTIONS: StatusFiltroOpcao[] = [
  { value: "liberado", label: STATUS_LABEL.liberado },
  { value: "suspenso", label: STATUS_LABEL.suspenso },
  { value: "departamento_medico", label: STATUS_LABEL.departamento_medico },
];

// Sem "iniciacao" aqui — só existe na Base (ver docs/superpowers/specs/
// 2026-09-09-atletas-resumo-filtros-design.md, seção 2). "formacao" migrou de sub-flag de "amador"
// pra valor próprio em 2026-09-10 (ver supabase/migrations/0097_atleta_contrato_formacao_tipo.sql).
const CONTRATO_OPTIONS_PROFISSIONAL = ["definitivo", "emprestimo", "amador", "formacao"] as const;

function calcularIdade(dataNascimento: string, hoje: Date): number {
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

/** Lista de Atletas do Futebol Profissional — espelha `app/base/atletas/[categoria]/page.tsx`, sem
 * categoria (departamento inteiro) e sem classificação G1/G2/G3 (só existe na Base). Resumo/filtros
 * e busca são inteiramente no client (ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md): a página só busca a lista completa, sem filtro
 * nenhum de status/busca na query. */
export default async function AtletasPage() {
  const supabase = createClient();

  const { data, error } = await supabase.from("atletas").select("*").order("nome_completo", { ascending: true });
  const atletas = (data ?? []) as AtletaRow[];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const idades = atletas.map((a) => calcularIdade(a.data_nascimento, hoje));
  const mediaIdade = idades.length > 0 ? idades.reduce((soma, i) => soma + i, 0) / idades.length : 0;

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: AtletaResumoItem[] = atletas.map((atleta, i) => ({
    id: atleta.id,
    nome: atleta.nome_completo,
    apelido: atleta.apelido,
    cpf: atleta.cpf,
    fotoUrl: fotoUrls[i],
    dataNascimento: atleta.data_nascimento,
    dataFimContrato: atleta.data_fim_contrato,
    tipoContrato: atleta.tipo_contrato,
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa,
    dispensado: false,
    status: atleta.status,
    href: `/atletas/${atleta.id}/ver`,
  }));

  return (
    <AppShell largura="total">
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Atletas</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/atletas/novo" className="btn-primary">
            + Novo atleta
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os atletas. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="mt-4">
        <AtletasResumoFiltros
          atletas={itens}
          statusOptions={STATUS_OPTIONS}
          contratoOptions={[...CONTRATO_OPTIONS_PROFISSIONAL]}
          estatisticaExtra={
            mediaIdade > 0 ? { label: "Média de idade", valor: mediaIdade.toFixed(1) } : undefined
          }
          exportar={{ excelHref: "/atletas/export", pdfHref: "/atletas/export/pdf" }}
        />
      </div>
    </AppShell>
  );
}
