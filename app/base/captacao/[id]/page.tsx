import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";
import { atualizarCaptacao, excluirCaptacao, mudarStatusCaptacao } from "../actions";
import { CaptacaoForm } from "../captacao-form";
import { AprovarButton } from "../aprovar-button";

export default async function EditarCandidatoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("captacao_base").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const candidato = data as CaptacaoBaseRow;

  const defaultValues: Record<string, string> = {
    nomeCompleto: candidato.nome_completo,
    dataInicio: candidato.data_inicio ?? "",
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
    empresarioNome: candidato.empresario_nome ?? "",
    empresarioTelefone: candidato.empresario_telefone ?? "",
    agencia: candidato.agencia ?? "",
    valorAjudaCusto: candidato.valor_ajuda_custo != null ? String(candidato.valor_ajuda_custo) : "",
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
      <div className="mt-1 flex justify-center">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${corCaptacaoStatus(candidato.status)}`}>
          {captacaoStatusLabel(candidato.status)}
        </span>
      </div>

      <section className="card mt-6 space-y-4 p-5">
        {candidato.atleta_gerado_id ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Aprovado — o cadastro de Atleta já foi criado.{" "}
            {candidato.categoria ? (
              <Link
                href={`/base/atletas/${candidato.categoria}/${candidato.atleta_gerado_id}`}
                className="font-semibold underline"
              >
                Ver cadastro do Atleta
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              Ao aprovar, o sistema cria o cadastro completo em Atletas
              {candidato.categoria ? ` (${categoriaBaseLabel(candidato.categoria)})` : ""} com os dados já
              preenchidos aqui — o que faltar (RG, CPF, número de camisa etc.) você completa depois.
            </p>
            <AprovarButton captacaoId={candidato.id} />
          </>
        )}

        <div className="flex flex-wrap gap-2 border-t border-linha pt-4">
          <form action={mudarStatusCaptacao}>
            <input type="hidden" name="id" value={candidato.id} />
            <input type="hidden" name="status" value="dispensado" />
            <button type="submit" className="btn-secondary text-sm">
              Dispensar
            </button>
          </form>
          <form action={mudarStatusCaptacao}>
            <input type="hidden" name="id" value={candidato.id} />
            <input type="hidden" name="status" value="nao_compareceu" />
            <button type="submit" className="btn-secondary text-sm">
              Marcar não compareceu
            </button>
          </form>
          {candidato.status !== "avaliacao" && !candidato.atleta_gerado_id ? (
            <form action={mudarStatusCaptacao}>
              <input type="hidden" name="id" value={candidato.id} />
              <input type="hidden" name="status" value="avaliacao" />
              <button type="submit" className="btn-secondary text-sm">
                Reabrir avaliação
              </button>
            </form>
          ) : null}
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
