import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
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
  JogoRow,
  JogoVagasStaffFuncaoRow,
  JogoVagasStaffInscricaoRow,
  JogoVagasStaffRow,
  StaffFuncaoCatalogoRow,
  StaffOperacionalRow,
} from "@/lib/supabase/types";
import { alternarVagasAbertas, chamarDaEspera, removerInscricao, salvarVagas } from "./actions";
import { LinkVagas } from "./link-vagas";
import { VagasForm, type FuncaoInicial } from "./vagas-form";

function formatQuando(iso: string): string {
  const [data, hora] = iso.split("T");
  const [ano, mes, dia] = (data ?? "").split("-");
  return `${dia}/${mes}/${ano} às ${(hora ?? "").slice(0, 5)}`;
}

/**
 * Vagas de Staff do jogo: o Mateus abre as vagas por função, manda o link, e acompanha quem pegou.
 * Ninguém é selecionado — é por ordem de chegada, e o limite é garantido pela função
 * `pegar_vaga_staff` no banco (ver 0073_vagas_staff_jogo.sql).
 */
export default async function VagasStaffPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: vagasData }, { data: funcoesCatalogoData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase.from("jogo_vagas_staff").select("*").eq("jogo_id", params.id).maybeSingle(),
    supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
  ]);

  if (!jogoData) notFound();
  const jogo = jogoData as JogoRow;
  const vagas = vagasData as JogoVagasStaffRow | null;
  const funcoesCatalogo = (funcoesCatalogoData ?? []) as StaffFuncaoCatalogoRow[];
  const nomePorFuncaoId = new Map(funcoesCatalogo.map((f) => [f.id, f.nome]));

  let funcoes: JogoVagasStaffFuncaoRow[] = [];
  let inscricoes: JogoVagasStaffInscricaoRow[] = [];
  let staffPorId = new Map<string, StaffOperacionalRow>();

  if (vagas) {
    const [{ data: funcoesData }, { data: inscricoesData }] = await Promise.all([
      supabase.from("jogo_vagas_staff_funcoes").select("*").eq("vagas_id", vagas.id),
      supabase
        .from("jogo_vagas_staff_inscricoes")
        .select("*")
        .eq("vagas_id", vagas.id)
        .order("created_at", { ascending: true }),
    ]);
    funcoes = (funcoesData ?? []) as JogoVagasStaffFuncaoRow[];
    inscricoes = (inscricoesData ?? []) as JogoVagasStaffInscricaoRow[];

    const staffIds = inscricoes.map((i) => i.staff_id);
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase.from("staff_operacional").select("*").in("id", staffIds);
      staffPorId = new Map(((staffData ?? []) as StaffOperacionalRow[]).map((s) => [s.id, s]));
    }
  }

  const resumos = montarResumo(funcoes, inscricoes, nomePorFuncaoId);
  const total = totalVagas(resumos);
  const ocupadas = totalOcupadas(resumos);
  const confirmados = inscricoes.filter((i) => i.situacao === "confirmado");
  const espera = inscricoes.filter((i) => i.situacao === "espera");
  const nomeDaVagaFuncao = new Map(resumos.map((r) => [r.vagaFuncaoId, r.funcaoNome]));

  const funcoesIniciais: FuncaoInicial[] = funcoes.map((f) => ({
    funcaoId: f.funcao_id,
    quantidade: f.quantidade,
    horario: f.horario_apresentacao,
    inscritos: inscricoes.filter((i) => i.vaga_funcao_id === f.id).length,
  }));

  const salvarAction = salvarVagas.bind(null, jogo.id);
  const alternarAction = alternarVagasAbertas.bind(null, jogo.id);
  const removerAction = removerInscricao.bind(null, jogo.id);
  const chamarAction = chamarDaEspera.bind(null, jogo.id);

  const dataTexto = `${formatDataBr(jogo.data_jogo)}${formatHorario(jogo.horario) ? ` · ${formatHorario(jogo.horario)}` : ""}`;
  const mensagemWhatsapp = `Vagas de trabalho — ${buildConfrontoTexto(jogo)} (${dataTexto}). Pegue a sua:`;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="vagas" />

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
            <LinkVagas token={vagas.token} mensagem={mensagemWhatsapp} />
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
        <section className="card tabela-rolavel mt-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Pessoa</th>
                <th className="px-4 py-3">Vaga</th>
                <th className="px-4 py-3">Pegou em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {confirmados.map((i, indice) => {
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
                    <td className="px-4 py-3 text-neutral-600">{nomeDaVagaFuncao.get(i.vaga_funcao_id) ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{formatQuando(i.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={removerAction}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">
                          Remover
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {espera.map((i) => {
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
                    <td className="px-4 py-3 text-neutral-600">{nomeDaVagaFuncao.get(i.vaga_funcao_id) ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{formatQuando(i.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <form action={chamarAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <button type="submit" className="text-xs font-semibold text-emerald-700 hover:underline">
                            Chamar
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
      ) : vagas ? (
        <p className="card mt-4 p-6 text-center text-sm text-neutral-400">
          Ninguém pegou vaga ainda. Mande o link no grupo.
        </p>
      ) : null}
    </AppShell>
  );
}
