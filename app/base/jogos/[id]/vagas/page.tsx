import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { buildConfrontoTexto } from "@/lib/posters/jogo-texto";
import { formatDataBr, formatHorario } from "@/lib/posters/relacionados-data";
import {
  montarResumo,
  totalOcupadas,
  totalVagas,
  vagasRestantes,
} from "@/lib/futebol/vagas-staff";
import type {
  JogoBaseRow,
  JogoVagasStaffBaseFuncaoRow,
  JogoVagasStaffBaseInscricaoRow,
  JogoVagasStaffBaseRow,
  StaffFuncaoCatalogoRow,
  StaffOperacionalBaseRow,
} from "@/lib/supabase/types";
import {
  alternarVagasAbertasBase,
  chamarDaEsperaBase,
  removerInscricaoBase,
  salvarVagasBase,
  trocarFuncaoInscricaoBase,
} from "./actions";
import { LinkVagas } from "@/components/link-vagas";
import { VagasForm, type FuncaoInicial } from "@/components/vagas-form";

function formatQuando(iso: string): string {
  const [data, hora] = iso.split("T");
  const [ano, mes, dia] = (data ?? "").split("-");
  return `${dia}/${mes}/${ano} às ${(hora ?? "").slice(0, 5)}`;
}

/**
 * Espelha `app/jogos/[id]/vagas/page.tsx` para o Futebol de Base — mesma tela, tabelas
 * `jogo_vagas_staff_base*` e link público em `/vagas-base/<token>`. Ninguém é selecionado — é por
 * ordem de chegada, e o limite é garantido pela função `pegar_vaga_staff_base` no banco (ver
 * 0075_vagas_staff_base.sql).
 */
export default async function VagasStaffBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: vagasData }, { data: funcoesCatalogoData }] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("id", params.id).single(),
    supabase.from("jogo_vagas_staff_base").select("*").eq("jogo_id", params.id).maybeSingle(),
    supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
  ]);

  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;
  const vagas = vagasData as JogoVagasStaffBaseRow | null;
  const funcoesCatalogo = (funcoesCatalogoData ?? []) as StaffFuncaoCatalogoRow[];
  const nomePorFuncaoId = new Map(funcoesCatalogo.map((f) => [f.id, f.nome]));

  let funcoes: JogoVagasStaffBaseFuncaoRow[] = [];
  let inscricoes: JogoVagasStaffBaseInscricaoRow[] = [];
  let staffPorId = new Map<string, StaffOperacionalBaseRow>();

  if (vagas) {
    const [{ data: funcoesData }, { data: inscricoesData }] = await Promise.all([
      supabase.from("jogo_vagas_staff_base_funcoes").select("*").eq("vagas_id", vagas.id),
      supabase
        .from("jogo_vagas_staff_base_inscricoes")
        .select("*")
        .eq("vagas_id", vagas.id)
        .order("created_at", { ascending: true }),
    ]);
    funcoes = (funcoesData ?? []) as JogoVagasStaffBaseFuncaoRow[];
    inscricoes = (inscricoesData ?? []) as JogoVagasStaffBaseInscricaoRow[];

    const staffIds = inscricoes.map((i) => i.staff_id);
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase.from("staff_operacional_base").select("*").in("id", staffIds);
      staffPorId = new Map(((staffData ?? []) as StaffOperacionalBaseRow[]).map((s) => [s.id, s]));
    }
  }

  const resumos = montarResumo(funcoes, inscricoes, nomePorFuncaoId);
  const total = totalVagas(resumos);
  const ocupadas = totalOcupadas(resumos);
  const confirmados = inscricoes.filter((i) => i.situacao === "confirmado");
  const espera = inscricoes.filter((i) => i.situacao === "espera");

  // Agrupa quem já pegou vaga por função — ver o comentário equivalente no Profissional
  // (`app/jogos/[id]/vagas/page.tsx`).
  const confirmadosPorFuncao = new Map<string, JogoVagasStaffBaseInscricaoRow[]>();
  const esperaPorFuncao = new Map<string, JogoVagasStaffBaseInscricaoRow[]>();
  for (const i of confirmados) {
    const lista = confirmadosPorFuncao.get(i.vaga_funcao_id) ?? [];
    lista.push(i);
    confirmadosPorFuncao.set(i.vaga_funcao_id, lista);
  }
  for (const i of espera) {
    const lista = esperaPorFuncao.get(i.vaga_funcao_id) ?? [];
    lista.push(i);
    esperaPorFuncao.set(i.vaga_funcao_id, lista);
  }

  const funcoesIniciais: FuncaoInicial[] = funcoes.map((f) => ({
    funcaoId: f.funcao_id,
    quantidade: f.quantidade,
    horario: f.horario_apresentacao,
    inscritos: inscricoes.filter((i) => i.vaga_funcao_id === f.id).length,
  }));

  const salvarAction = salvarVagasBase.bind(null, jogo.id);
  const alternarAction = alternarVagasAbertasBase.bind(null, jogo.id);
  const removerAction = removerInscricaoBase.bind(null, jogo.id);
  const chamarAction = chamarDaEsperaBase.bind(null, jogo.id);
  const trocarAction = trocarFuncaoInscricaoBase.bind(null, jogo.id);

  const dataTexto = `${formatDataBr(jogo.data_jogo)}${formatHorario(jogo.horario) ? ` · ${formatHorario(jogo.horario)}` : ""}`;
  const mensagemWhatsapp = `Vagas de trabalho — ${buildConfrontoTexto(jogo)} (${dataTexto}). Pegue a sua:`;

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="vagas" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Vagas de Staff</h1>
        {vagas ? (
          <form action={alternarAction}>
            <input type="hidden" name="abrir" value={vagas.aberto ? "0" : "1"} />
            <button type="submit" className={vagas.aberto ? "btn-secondary" : "btn-primary"}>
              {vagas.aberto ? "Fechar vagas agora" : "Reabrir vagas"}
            </button>
          </form>
        ) : null}
      </div>

      {vagas ? (
        <section className="card mb-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-neutral-600">
              <span className="text-2xl font-bold text-grena-escuro">{ocupadas}</span> de {total} vaga
              {total === 1 ? "" : "s"} preenchida{ocupadas === 1 ? "" : "s"}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                vagas.aberto ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {vagas.aberto ? "Vagas abertas" : "Encerrado"}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: total > 0 ? `${Math.round((ocupadas / total) * 100)}%` : "0%" }}
            />
          </div>

          {resumos.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {resumos.map((r) => {
                const restantes = vagasRestantes(r);
                return (
                  <div key={r.vagaFuncaoId} className="rounded-md border border-linha px-3 py-2">
                    <p className="text-sm font-semibold text-neutral-800">{r.funcaoNome}</p>
                    <p className={`text-xs font-semibold ${restantes === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                      {r.ocupadas} de {r.quantidade} {restantes === 0 ? "· completo" : "preenchidas"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4">
            <p className="field-label">Link para o grupo</p>
            <LinkVagas token={vagas.token} mensagem={mensagemWhatsapp} caminho="/vagas-base" />
          </div>
        </section>
      ) : (
        <p className="card mb-4 p-5 text-sm text-neutral-600">
          Defina abaixo quais funções o jogo precisa e quantas vagas cada uma tem. Ao salvar, o sistema gera o
          link para você mandar no grupo.
        </p>
      )}

      <VagasForm
        action={salvarAction}
        funcoes={funcoesCatalogo}
        funcoesIniciais={funcoesIniciais}
        horarioInicial={vagas?.horario_apresentacao ?? ""}
        localInicial={vagas?.local_apresentacao ?? ""}
        observacoesIniciais={vagas?.observacoes ?? ""}
      />

      {inscricoes.length > 0 ? (
        <div className="mt-4 space-y-4">
          {resumos.map((r) => {
            const confirmadosDaFuncao = confirmadosPorFuncao.get(r.vagaFuncaoId) ?? [];
            const esperaDaFuncao = esperaPorFuncao.get(r.vagaFuncaoId) ?? [];
            if (confirmadosDaFuncao.length === 0 && esperaDaFuncao.length === 0) return null;

            return (
              <section key={r.vagaFuncaoId} className="card tabela-rolavel">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-3">
                  <h3 className="text-sm font-bold text-grena-escuro">{r.funcaoNome}</h3>
                  <span className="text-xs font-semibold text-neutral-500">
                    {r.ocupadas} de {r.quantidade} preenchidas
                  </span>
                </div>
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Pessoa</th>
                      <th className="px-4 py-3">Pegou em</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {confirmadosDaFuncao.map((i, indice) => {
                      const pessoa = staffPorId.get(i.staff_id);
                      return (
                        <tr key={i.id}>
                          <td className="px-4 py-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-grena text-xs font-bold text-white">
                              {indice + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-800">{pessoa?.nome_completo ?? "—"}</p>
                            <p className="text-xs text-neutral-500">{pessoa?.telefone ?? ""}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-400">{formatQuando(i.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <form action={trocarAction} className="flex items-center gap-1.5">
                                <input type="hidden" name="id" value={i.id} />
                                <select
                                  name="vagaFuncaoId"
                                  defaultValue={i.vaga_funcao_id}
                                  className="rounded-md border border-linha px-2 py-1 text-xs focus:border-grena focus:outline-none focus:ring-1 focus:ring-grena"
                                >
                                  {resumos.map((opcao) => (
                                    <option key={opcao.vagaFuncaoId} value={opcao.vagaFuncaoId}>
                                      {opcao.funcaoNome} ({opcao.ocupadas}/{opcao.quantidade})
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" className="text-xs font-semibold text-grena hover:underline">
                                  Trocar
                                </button>
                              </form>
                              <form action={removerAction}>
                                <input type="hidden" name="id" value={i.id} />
                                <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">
                                  Remover
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {esperaDaFuncao.map((i) => {
                      const pessoa = staffPorId.get(i.staff_id);
                      return (
                        <tr key={i.id} className="bg-indigo-50/40">
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                              espera
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-800">{pessoa?.nome_completo ?? "—"}</p>
                            <p className="text-xs text-neutral-500">{pessoa?.telefone ?? ""}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-400">{formatQuando(i.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <form action={chamarAction}>
                                <input type="hidden" name="id" value={i.id} />
                                <button type="submit" className="text-xs font-semibold text-emerald-700 hover:underline">
                                  Chamar
                                </button>
                              </form>
                              <form action={trocarAction} className="flex items-center gap-1.5">
                                <input type="hidden" name="id" value={i.id} />
                                <select
                                  name="vagaFuncaoId"
                                  defaultValue={i.vaga_funcao_id}
                                  className="rounded-md border border-linha px-2 py-1 text-xs focus:border-grena focus:outline-none focus:ring-1 focus:ring-grena"
                                >
                                  {resumos.map((opcao) => (
                                    <option key={opcao.vagaFuncaoId} value={opcao.vagaFuncaoId}>
                                      {opcao.funcaoNome} ({opcao.ocupadas}/{opcao.quantidade})
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" className="text-xs font-semibold text-grena hover:underline">
                                  Trocar
                                </button>
                              </form>
                              <form action={removerAction}>
                                <input type="hidden" name="id" value={i.id} />
                                <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">
                                  Remover
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      ) : vagas ? (
        <p className="card mt-4 p-6 text-center text-sm text-neutral-400">
          Ninguém pegou vaga ainda. Mande o link no grupo.
        </p>
      ) : null}
    </AppShell>
  );
}
