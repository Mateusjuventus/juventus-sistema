import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { TarefaStatusBadge, TarefaStatusSelect } from "@/components/tarefa-status";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTarefasVisiveis } from "@/lib/auth/role";
import { TAREFA_CATEGORIAS } from "@/lib/validation/schemas";
import type { TarefaCategoria, TarefaRow } from "@/lib/supabase/types";
import { atualizarMinhasCategoriasTarefas, deleteTarefa, updateTarefaStatus } from "./actions";

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const supabase = createClient();
  const categoriasVisiveis = await getCategoriasTarefasVisiveis(supabase);
  const categoriasExibidas = TAREFA_CATEGORIAS.filter((c) => categoriasVisiveis.includes(c.value));
  // Se por algum motivo a pessoa não tiver nenhuma categoria liberada, mostra todas mesmo assim —
  // uma tela de Tarefas totalmente vazia sem explicação é pior do que mostrar tudo.
  const categoriasParaAba = categoriasExibidas.length > 0 ? categoriasExibidas : TAREFA_CATEGORIAS;

  const categoriaAtiva = (
    categoriasParaAba.some((c) => c.value === searchParams.categoria)
      ? searchParams.categoria
      : categoriasParaAba[0].value
  ) as TarefaCategoria;

  const { data, error } = await supabase
    .from("tarefas")
    .select("*")
    .eq("categoria", categoriaAtiva)
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const tarefas = (data ?? []) as TarefaRow[];
  const abertas = tarefas.filter((t) => t.status !== "concluido");
  const concluidas = tarefas.filter((t) => t.status === "concluido");

  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Tarefas" />
      <div className="mt-3 flex justify-end">
        <Link href={`/tarefas/novo?categoria=${categoriaAtiva}`} className="btn-primary">
          + Nova tarefa
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-neutral-200">
        {categoriasParaAba.map((c) => (
          <Link
            key={c.value}
            href={`/tarefas?categoria=${c.value}`}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              categoriaAtiva === c.value
                ? "border-b-2 border-grena text-grena-escuro"
                : "text-neutral-500 hover:text-grena"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer select-none text-neutral-500 hover:text-grena">
          Personalizar categorias
        </summary>
        <form
          action={atualizarMinhasCategoriasTarefas}
          className="card mt-2 space-y-2 p-4"
        >
          <p className="text-xs text-neutral-500">
            Escolha quais abas aparecem pra você aqui em Tarefas — não afeta ninguém, nem esconde
            as tarefas de outra categoria (elas continuam existindo, só não aparecem como aba).
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TAREFA_CATEGORIAS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  name="categorias"
                  value={c.value}
                  defaultChecked={categoriasVisiveis.includes(c.value)}
                  className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                />
                {c.label}
              </label>
            ))}
          </div>
          <button type="submit" className="btn-secondary btn-sm">
            Salvar
          </button>
        </form>
      </details>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar as tarefas. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {abertas.length === 0 && !error ? (
          <div className="card p-8 text-center text-neutral-400">
            Nenhuma tarefa em aberto nesta categoria.
          </div>
        ) : null}

        {abertas.map((t) => {
          const prazoFormatado = formatData(t.prazo);
          const atrasada = t.prazo !== null && t.prazo < hojeStr;
          return (
            <div key={t.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[200px] flex-1">
                <p className="font-medium text-neutral-800">{t.titulo}</p>
                {t.descricao ? <p className="mt-0.5 text-sm text-neutral-500">{t.descricao}</p> : null}
              </div>
              {prazoFormatado ? (
                <span className={`text-sm ${atrasada ? "font-semibold text-red-700" : "text-neutral-500"}`}>
                  {atrasada ? "Atrasada · " : "Prazo: "}
                  {prazoFormatado}
                </span>
              ) : null}
              <TarefaStatusSelect id={t.id} status={t.status} action={updateTarefaStatus} />
              <div className="flex gap-2">
                <Link href={`/tarefas/${t.id}`} className="btn-secondary">
                  Editar
                </Link>
                <DeleteButton action={deleteTarefa} id={t.id} entityLabel="tarefa" />
              </div>
            </div>
          );
        })}
      </div>

      {concluidas.length > 0 ? (
        <details className="mt-6 rounded-lg border border-neutral-200">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-600">
            Concluídas ({concluidas.length})
          </summary>
          <div className="space-y-3 border-t border-neutral-200 p-4">
            {concluidas.map((t) => (
              <div key={t.id} className="card flex flex-wrap items-center gap-3 p-4 opacity-75">
                <div className="min-w-[200px] flex-1">
                  <p className="font-medium text-neutral-600 line-through">{t.titulo}</p>
                  {t.descricao ? <p className="mt-0.5 text-sm text-neutral-400">{t.descricao}</p> : null}
                </div>
                <TarefaStatusBadge status={t.status} />
                <div className="flex gap-2">
                  <Link href={`/tarefas/${t.id}`} className="btn-secondary">
                    Editar
                  </Link>
                  <DeleteButton action={deleteTarefa} id={t.id} entityLabel="tarefa" />
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}
