import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";
import { atualizarCaptacao, excluirCaptacao, mudarStatusCaptacao } from "../actions";
import { CaptacaoForm } from "../captacao-form";
import { CaptacaoStatusSelect } from "../captacao-status-select";
import { AprovarInscricaoForm } from "../aprovacoes/aprovar-inscricao-form";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function EditarCandidatoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("captacao_base").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const candidato = data as CaptacaoBaseRow;

  const defaultValues: Record<string, string> = {
    nomeCompleto: candidato.nome_completo,
    dataInicio: candidato.data_inicio ?? "",
    dataTermino: candidato.data_termino ?? "",
    dataNascimento: candidato.data_nascimento ?? "",
    posicao: candidato.posicao ?? "",
    categoria: candidato.categoria ?? "",
    indicacao: candidato.indicacao ?? "",
    desejaAlojamento: candidato.deseja_alojamento ? "on" : "",
    status: candidato.status,
    observacoes: candidato.observacoes ?? "",
    telefone: candidato.telefone ?? "",
    maeNome: candidato.mae_nome ?? "",
    maeTelefone: candidato.mae_telefone ?? "",
    paiNome: candidato.pai_nome ?? "",
    paiTelefone: candidato.pai_telefone ?? "",
    escola: candidato.escola ?? "",
    cep: candidato.cep ?? "",
    logradouro: candidato.logradouro ?? "",
    numero: candidato.numero_endereco ?? "",
    complemento: candidato.complemento ?? "",
    bairro: candidato.bairro ?? "",
    cidade: candidato.cidade ?? "",
    uf: candidato.uf ?? "",
  };

  const atualizarAction = atualizarCaptacao.bind(null, candidato.id);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/captacao" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Captação/Avaliação
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <PageHeader title={`Candidato Nº ${candidato.numero}`} />
      </div>
      <div className="mt-1 flex flex-col items-center gap-2">
        {candidato.status === "inscricao" ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${corCaptacaoStatus(candidato.status)}`}>
            {captacaoStatusLabel(candidato.status)}
          </span>
        ) : (
          <CaptacaoStatusSelect id={candidato.id} status={candidato.status} action={mudarStatusCaptacao} />
        )}
        {candidato.data_inicio ? (
          <p className="text-xs text-neutral-500">
            Início {formatDataBr(candidato.data_inicio)}
            {candidato.data_termino ? ` · Término ${formatDataBr(candidato.data_termino)}` : ""}
          </p>
        ) : null}
      </div>

      <section className="card mt-6 space-y-4 p-5">
        {candidato.status === "inscricao" ? (
          <>
            <p className="text-sm text-neutral-600">
              Inscrição enviada pelo link público — aprovar pede a Data de Início e manda pra Em
              avaliação; Recusar manda direto pra Dispensado.
            </p>
            <AprovarInscricaoForm candidatoId={candidato.id} />
          </>
        ) : (
          <p className="text-sm text-neutral-600">
            Troque o status ali em cima a qualquer momento. Ao marcar Aprovado, Dispensado ou Não
            compareceu, a Data de término é preenchida automaticamente com a data de hoje — dá pra
            ajustar no formulário abaixo, se precisar.
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-linha pt-4">
          <form action={excluirCaptacao} className="ml-auto">
            <input type="hidden" name="id" value={candidato.id} />
            <button type="submit" className="text-sm font-semibold text-red-700 hover:underline">
              Excluir candidato
            </button>
          </form>
        </div>
      </section>

      <div className="card mt-4 p-6">
        <CaptacaoForm
          action={atualizarAction}
          entityId={candidato.id}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
