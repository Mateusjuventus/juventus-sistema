import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getFisioterapiaPodeEditar } from "@/lib/auth/role";
import { diasAfastados, fisioterapiaTipoLabel } from "@/lib/futebol/fisioterapia";
import { hojeBrasilia } from "@/lib/data-brasil";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type {
  AtletaRow,
  FisioterapiaAtendimentoRow,
  FisioterapiaHistoricoImportadoRow,
  FisioterapiaLesaoRow,
  FisioterapiaQueixaRow,
} from "@/lib/supabase/types";
import {
  EncerrarLesaoForm,
  LesaoItem,
  NovaLesaoForm,
  NovaQueixaForm,
  NovoAtendimentoForm,
  QueixaItem,
} from "./fisioterapia-forms";

/**
 * Ficha do atleta na sub-área Fisioterapia — três seções cronológicas (Lesões, Queixas,
 * Atendimentos), formulários de "+ Novo/Nova" só pra quem pode editar, PDF individual visível pra
 * todo mundo. Ver docs/superpowers/specs/2026-09-30-fisioterapia-design.md, seção 3.
 */
export default async function FisioterapiaAtletaPage({ params }: { params: { atletaId: string } }) {
  const supabase = createClient();

  const [
    { data: atletaData },
    { data: lesoesData },
    { data: queixasData },
    { data: atendimentosData },
    { data: historicoData },
    podeEditar,
  ] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.atletaId).maybeSingle(),
    supabase
      .from("fisioterapia_lesoes")
      .select("*")
      .eq("atleta_id", params.atletaId)
      .order("data_inicio", { ascending: false, nullsFirst: false }),
    supabase
      .from("fisioterapia_queixas")
      .select("*")
      .eq("atleta_id", params.atletaId)
      .order("data", { ascending: false, nullsFirst: false }),
    supabase
      .from("fisioterapia_atendimentos")
      .select("*")
      .eq("atleta_id", params.atletaId)
      .order("data", { ascending: false, nullsFirst: false }),
    supabase
      .from("fisioterapia_historico_importado")
      .select("*")
      .eq("atleta_id", params.atletaId)
      .order("created_at", { ascending: true }),
    getFisioterapiaPodeEditar(supabase),
  ]);

  if (!atletaData) notFound();

  const atleta = atletaData as AtletaRow;
  const lesoes = (lesoesData ?? []) as FisioterapiaLesaoRow[];
  const queixas = (queixasData ?? []) as FisioterapiaQueixaRow[];
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoRow[];
  const historico = (historicoData ?? []) as FisioterapiaHistoricoImportadoRow[];
  // `l.data_inicio &&`: uma lesão do histórico importado (sem data, ver migração 0115) também tem
  // `data_fim` nula, mas não é uma lesão ativa agora — não faz sentido oferecer ela no "ligar a uma
  // lesão em andamento" do formulário de atendimento.
  const lesoesAtivas = lesoes.filter((l) => l.data_inicio && !l.data_fim);

  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const hojeStr = hojeBrasilia();
  const lesaoPorId = new Map(lesoes.map((l) => [l.id, l]));

  return (
    <AppShell>
      <Link href="/departamento-medico/fisioterapia" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <AtletaAvatarCirculo nome={atleta.nome_completo} fotoUrl={fotoUrl} className="h-16 w-16" />
          <div>
            <p className="text-lg font-semibold text-neutral-800">{atleta.nome_completo}</p>
            {atleta.apelido ? <p className="text-sm text-neutral-500">&ldquo;{atleta.apelido}&rdquo;</p> : null}
            <p className="mt-1 text-sm text-neutral-500">
              {atleta.posicao} · Nasc. {formatDataBr(atleta.data_nascimento)}
            </p>
          </div>
        </div>
        <a href={`/departamento-medico/fisioterapia/${atleta.id}/pdf`} className="btn-secondary" target="_blank">
          Gerar relatório em PDF
        </a>
      </div>

      {historico.length > 0 ? (
        <section className="card mt-4 border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Histórico anterior ao sistema
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Importado do relatório em papel do departamento — sem data exata de cada evento, só como referência.
          </p>
          <ul className="mt-3 space-y-3">
            {historico.map((item) => (
              <li key={item.id} className="border-t border-neutral-200 pt-2">
                <p className="whitespace-pre-line text-sm text-neutral-600">{item.resumo}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Lesões</h2>
          {lesoes.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">Nenhuma lesão registrada.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {lesoes.map((lesao) => {
                const dias = diasAfastados(lesao.data_inicio, lesao.data_fim, hojeStr);
                return (
                  <li key={lesao.id} className="border-t border-neutral-100 pt-2">
                    {podeEditar ? (
                      <LesaoItem atletaId={atleta.id} lesao={lesao} hojeStr={hojeStr} />
                    ) : (
                      <>
                        <p className="text-sm font-medium text-neutral-800">{lesao.descricao}</p>
                        <p className="mt-0.5 text-xs font-semibold text-grena">{fisioterapiaTipoLabel(lesao.tipo)}</p>
                        {lesao.data_inicio ? (
                          <p className="text-xs text-neutral-500">
                            {formatDataBr(lesao.data_inicio)} até{" "}
                            {lesao.data_fim ? formatDataBr(lesao.data_fim) : "hoje"} · {dias} dia
                            {dias === 1 ? "" : "s"} afastado
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-400">Histórico anterior ao sistema — sem data exata.</p>
                        )}
                        {lesao.data_inicio && !lesao.data_fim ? (
                          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Em andamento
                          </span>
                        ) : null}
                        {lesao.observacoes ? <p className="mt-1 text-xs text-neutral-500">{lesao.observacoes}</p> : null}
                      </>
                    )}
                    {podeEditar && lesao.data_inicio && !lesao.data_fim ? (
                      <EncerrarLesaoForm atletaId={atleta.id} lesaoId={lesao.id} dataInicio={lesao.data_inicio} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {podeEditar ? <NovaLesaoForm atletaId={atleta.id} /> : null}
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Queixas</h2>
          {queixas.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">Nenhuma queixa registrada.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {queixas.map((queixa) =>
                podeEditar ? (
                  <li key={queixa.id} className="border-t border-neutral-100 pt-2">
                    <QueixaItem atletaId={atleta.id} queixa={queixa} />
                  </li>
                ) : (
                  <li key={queixa.id} className="border-t border-neutral-100 pt-2">
                    <p className="text-sm font-medium text-neutral-800">{queixa.descricao}</p>
                    <p className="mt-0.5 text-xs font-semibold text-grena">{fisioterapiaTipoLabel(queixa.tipo)}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {queixa.data ? formatDataBr(queixa.data) : "histórico, sem data exata"}
                    </p>
                  </li>
                ),
              )}
            </ul>
          )}
          {podeEditar ? <NovaQueixaForm atletaId={atleta.id} /> : null}
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Atendimentos</h2>
          {atendimentos.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">Nenhum atendimento registrado.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {atendimentos.map((atendimento) => {
                const lesaoVinculada = atendimento.lesao_id ? lesaoPorId.get(atendimento.lesao_id) : null;
                return (
                  <li key={atendimento.id} className="border-t border-neutral-100 pt-2">
                    <p className="text-sm font-medium text-neutral-800">
                      {atendimento.data ? formatDataBr(atendimento.data) : "Histórico, sem data exata"}
                    </p>
                    <p className="text-xs text-neutral-500">{atendimento.descricao}</p>
                    {lesaoVinculada ? (
                      <p className="mt-0.5 text-xs text-neutral-400">Ligado à lesão: {lesaoVinculada.descricao}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {podeEditar ? (
            <NovoAtendimentoForm
              atletaId={atleta.id}
              lesoesAtivas={lesoesAtivas.map((l) => ({ id: l.id, descricao: l.descricao }))}
            />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
