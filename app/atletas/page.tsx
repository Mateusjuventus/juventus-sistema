import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import type { AtletaRow, AtletaStatus } from "@/lib/supabase/types";
import { deleteAtleta } from "./actions";

const CONTRATO_A_VENCER_DIAS = 90;

const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
};

const STATUS_BADGE_CLASS: Record<AtletaStatus, string> = {
  liberado: "bg-green-100 text-green-800",
  suspenso: "bg-red-100 text-red-800",
  departamento_medico: "bg-amber-100 text-amber-800",
};

function StatusBadge({ status }: { status: AtletaStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function calcularIdade(dataNascimento: string, hoje: Date): number {
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

function diasAte(data: string, hoje: Date): number {
  const alvo = new Date(data);
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((alvo.getTime() - hoje.getTime()) / msPorDia);
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function AtletasPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("atletas").select("*").order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (status) query = query.eq("status", status);

  const [{ data, error }, { data: todosData }] = await Promise.all([
    query,
    supabase.from("atletas").select("status, data_nascimento, data_fim_contrato"),
  ]);
  const atletas = (data ?? []) as AtletaRow[];
  const todos = (todosData ?? []) as Pick<AtletaRow, "status" | "data_nascimento" | "data_fim_contrato">[];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const idades = todos.map((a) => calcularIdade(a.data_nascimento, hoje));
  const mediaIdade = idades.length > 0 ? idades.reduce((soma, i) => soma + i, 0) / idades.length : 0;

  const contratosAVencer = todos.filter(
    (a) => a.data_fim_contrato && diasAte(a.data_fim_contrato, hoje) <= CONTRATO_A_VENCER_DIAS,
  ).length;

  const totais = {
    total: todos.length,
    liberados: todos.filter((a) => a.status === "liberado").length,
    suspensos: todos.filter((a) => a.status === "suspenso").length,
    departamentoMedico: todos.filter((a) => a.status === "departamento_medico").length,
    mediaIdade,
    contratosAVencer,
  };

  const fotoUrls = await Promise.all(
    atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)),
  );

  const pendenciasAtletas: string[] = [];
  if (totais.contratosAVencer > 0) {
    pendenciasAtletas.push(
      `${totais.contratosAVencer} contrato${totais.contratosAVencer > 1 ? "s" : ""} a vencer`,
    );
  }
  if (totais.suspensos > 0) {
    pendenciasAtletas.push(`${totais.suspensos} suspenso${totais.suspensos > 1 ? "s" : ""}`);
  }
  const pendenciaAtletas = pendenciasAtletas.length > 0 ? pendenciasAtletas.join(" · ") : null;

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Atletas" pendencia={pendenciaAtletas} />
      <div className="mt-3 flex justify-end">
        <Link href="/atletas/novo" className="btn-primary">
          + Novo atleta
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-grena-escuro">{totais.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Liberados</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{totais.liberados}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Suspensos</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{totais.suspensos}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Dept. Médico</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{totais.departamentoMedico}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Média de idade</p>
          <p className="mt-1 text-2xl font-bold text-grena-escuro">
            {totais.mediaIdade > 0 ? totais.mediaIdade.toFixed(1) : "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Contratos a vencer (90d)
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{totais.contratosAVencer}</p>
        </div>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/atletas" defaultValue={q} placeholder="Buscar atleta por nome...">
          <div className="min-w-[180px]">
            <label htmlFor="status" className="field-label">
              Status
            </label>
            <select id="status" name="status" defaultValue={status} className="field-input">
              <option value="">Todos</option>
              <option value="liberado">Liberado</option>
              <option value="suspenso">Suspenso</option>
              <option value="departamento_medico">Departamento Médico</option>
            </select>
          </div>
        </SearchBar>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os atletas. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      {atletas.length === 0 && !error ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">Nenhum atleta encontrado.</div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {atletas.map((atleta, i) => {
          const venceLogo =
            atleta.data_fim_contrato && diasAte(atleta.data_fim_contrato, hoje) <= CONTRATO_A_VENCER_DIAS;
          return (
            <div key={atleta.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-center gap-4">
                {fotoUrls[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoUrls[i]!}
                    alt={atleta.nome_completo}
                    className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-neutral-100"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-400">
                    {atleta.nome_completo.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-800">{atleta.nome_completo}</p>
                  <p className="text-sm text-neutral-500">
                    {atleta.posicao}
                    {atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={atleta.status} />
                {venceLogo ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Contrato a vencer
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-neutral-100 pt-3 text-sm">
                <span className="text-neutral-400">CPF</span>
                <span className="text-neutral-700">{formatCPF(atleta.cpf)}</span>
                <span className="text-neutral-400">Contrato até</span>
                <span className={venceLogo ? "font-medium text-amber-700" : "text-neutral-700"}>
                  {formatData(atleta.data_fim_contrato)}
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
                <Link href={`/atletas/${atleta.id}`} className="btn-secondary">
                  Editar
                </Link>
                <DeleteButton action={deleteAtleta} id={atleta.id} entityLabel="atleta" />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
