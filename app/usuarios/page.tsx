import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import type { PerfilRow } from "@/lib/supabase/types";
import { atualizarPapel } from "./actions";
import { UsuarioForm } from "./usuario-form";

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default async function UsuariosPage() {
  const supabase = createClient();
  const master = await isMaster(supabase);
  if (!master) redirect("/profissional");

  const {
    data: { user: usuarioAtual },
  } = await supabase.auth.getUser();

  const { data } = await supabase.from("perfis").select("*").order("created_at", { ascending: true });
  const perfis = (data ?? []) as PerfilRow[];

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Usuários" />
      <p className="-mt-4 text-center text-sm text-neutral-500">
        Só quem é <strong>master</strong> pode excluir Entrada/Saída do Estoque e acessar esta tela.
      </p>

      <div className="mt-6">
        <UsuarioForm />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">Papel</th>
              <th className="px-4 py-3 font-semibold">Desde</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {perfis.map((perfil) => {
              const ehVocaMesmo = perfil.id === usuarioAtual?.id;
              return (
                <tr key={perfil.id}>
                  <td className="px-4 py-3">
                    {perfil.email}
                    {ehVocaMesmo ? <span className="ml-2 text-xs text-neutral-400">(você)</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        perfil.role === "master"
                          ? "bg-dourado/20 text-grena-escuro"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {perfil.role === "master" ? "Master" : "Regular"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDataHora(perfil.created_at)}</td>
                  <td className="px-4 py-3">
                    {ehVocaMesmo ? (
                      <p className="text-right text-xs text-neutral-400">—</p>
                    ) : (
                      <form action={atualizarPapel} className="flex justify-end">
                        <input type="hidden" name="id" value={perfil.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={perfil.role === "master" ? "regular" : "master"}
                        />
                        <button type="submit" className="btn-secondary btn-sm">
                          {perfil.role === "master" ? "Tornar regular" : "Tornar master"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
