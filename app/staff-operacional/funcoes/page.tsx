import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import { createFuncaoCatalogo, updateFuncaoCatalogo, deleteFuncaoCatalogo } from "./actions";
import { FuncaoCreateForm, FuncaoRenameForm } from "./funcao-forms";

/**
 * Gerencia o catálogo de funções (`staff_funcoes_catalogo`) usado no cadastro de Staff Operacional
 * — compartilhado entre Profissional e Base (por isso mora aqui, fora de `/base`, mas é acessível
 * a partir dos dois: ver o botão "Gerenciar funções" em `app/staff-operacional/page.tsx` e
 * `app/base/staff-operacional/page.tsx`, ambos passando `?voltar=base` quando vêm do Base pra essa
 * página saber pra onde voltar e com qual tema/nav mostrar).
 *
 * Uma função só pode ser excluída quando não está em uso por nenhum staff (Profissional ou Base) —
 * em vez de deixar o Postgres bloquear a exclusão com um erro de chave estrangeira, a contagem de
 * uso é calculada aqui e o botão de excluir simplesmente não aparece quando a função está em uso.
 */
export default async function FuncoesStaffPage({
  searchParams,
}: {
  searchParams: { voltar?: string };
}) {
  const veioDoBase = searchParams.voltar === "base";
  const supabase = createClient();

  const [{ data: funcoesData }, { data: staffProfData }, { data: staffBaseData }] = await Promise.all([
    supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
    supabase.from("staff_operacional").select("funcao_id, funcao_terceirizada_id"),
    supabase.from("staff_operacional_base").select("funcao_id, funcao_terceirizada_id"),
  ]);

  const funcoes = (funcoesData ?? []) as StaffFuncaoCatalogoRow[];

  const contagem = new Map<string, number>();
  for (const row of [...(staffProfData ?? []), ...(staffBaseData ?? [])] as {
    funcao_id: string;
    funcao_terceirizada_id: string | null;
  }[]) {
    contagem.set(row.funcao_id, (contagem.get(row.funcao_id) ?? 0) + 1);
    if (row.funcao_terceirizada_id) {
      contagem.set(row.funcao_terceirizada_id, (contagem.get(row.funcao_terceirizada_id) ?? 0) + 1);
    }
  }

  const voltarHref = veioDoBase ? "/base/staff-operacional" : "/staff-operacional";

  return (
    <AppShell departamento={veioDoBase ? "futebol_base" : "futebol_profissional"}>
      <Link href={voltarHref} className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Gerenciar Funções</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Catálogo de funções usado no cadastro de Staff Operacional — compartilhado entre o Futebol
        Profissional e o Futebol de Base.
      </p>

      <div className="mt-4">
        <FuncaoCreateForm action={createFuncaoCatalogo} />
      </div>

      <div className="mt-6 space-y-3">
        {funcoes.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">Nenhuma função cadastrada ainda.</div>
        ) : (
          funcoes.map((f) => {
            const emUso = contagem.get(f.id) ?? 0;
            return (
              <div key={f.id} className="card flex flex-wrap items-end gap-3 p-4">
                <div className="min-w-[220px] flex-1">
                  <FuncaoRenameForm funcao={f} action={updateFuncaoCatalogo} />
                </div>
                {emUso > 0 ? (
                  <p className="text-sm text-neutral-500">
                    Em uso por {emUso} {emUso === 1 ? "pessoa" : "pessoas"} — não pode ser excluída.
                  </p>
                ) : (
                  <DeleteButton action={deleteFuncaoCatalogo} id={f.id} entityLabel="função" />
                )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
