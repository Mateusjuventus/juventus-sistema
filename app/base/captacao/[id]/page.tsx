import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { BlocoAssinaturaDigital } from "@/components/bloco-assinatura-digital";
import { createClient } from "@/lib/supabase/server";
import { getSignedCaptacaoDocumentoUrl, getSignedPhotoUrl } from "@/lib/supabase/storage";
import { CAPTACAO_DOCUMENTO_LABEL, captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import { isMaster } from "@/lib/auth/role";
import { papeisAssinaturaParecer, podeAssinarPapel } from "@/lib/assinaturas/config";
import { buscarAssinaturas } from "@/lib/assinaturas/actions";
import type {
  CaptacaoBaseRow,
  CaptacaoDocumentoRow,
  CaptacaoDocumentoTipo,
  ConfiguracaoParecerCaptacaoBaseRow,
} from "@/lib/supabase/types";
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
  const fotoUrl = await getSignedPhotoUrl(supabase, candidato.foto_path);

  const { data: documentosData } = await supabase
    .from("captacao_documentos")
    .select("*")
    .eq("captacao_id", candidato.id);
  const documentosPorTipo = new Map(
    ((documentosData ?? []) as CaptacaoDocumentoRow[]).map((doc) => [doc.tipo, doc]),
  );
  // Sempre os 5 slots da ficha física, na mesma ordem — inclusive os que ainda não foram enviados
  // (candidato de origem "interno", ou inscrição de antes deste recurso existir), pra equipe ver de
  // cara o que falta, não só o que já chegou.
  const documentos = await Promise.all(
    (Object.keys(CAPTACAO_DOCUMENTO_LABEL) as CaptacaoDocumentoTipo[]).map(async (tipo) => {
      const doc = documentosPorTipo.get(tipo);
      const url = doc ? await getSignedCaptacaoDocumentoUrl(supabase, doc.arquivo_path) : null;
      return { tipo, label: CAPTACAO_DOCUMENTO_LABEL[tipo], url };
    }),
  );

  const [
    {
      data: { user },
    },
    master,
    { data: configParecerData },
    assinaturas,
  ] = await Promise.all([
    supabase.auth.getUser(),
    isMaster(supabase),
    supabase.from("configuracoes_parecer_captacao_base").select("assinaturas").limit(1).maybeSingle(),
    buscarAssinaturas("parecer_captacao_base", candidato.id),
  ]);
  const configAssinaturas =
    (configParecerData as Pick<ConfiguracaoParecerCaptacaoBaseRow, "assinaturas"> | null)?.assinaturas ?? [];
  const papeisParecer = papeisAssinaturaParecer(configAssinaturas);
  // Linha "ehTreinador" nunca entra aqui: assina sozinha quando o Treinador envia o parecer, na
  // tela dele (/treinador) — não fica disponível pra assinar manualmente nesta tela.
  const papeisQuePossoAssinar = user
    ? configAssinaturas
        .filter((a) => !a.ehTreinador && podeAssinarPapel(a.usuarioId, user.id, master))
        .map((a) => a.id)
    : [];

  // "Quem preencheu" o Parecer — o sistema não tem um campo de nome separado em `perfis`, só
  // e-mail (mesmo padrão usado em /usuarios), por isso mostra o e-mail do Treinador.
  let emailTreinador: string | null = null;
  if (candidato.parecer_preenchido_por) {
    const { data: perfilTreinador } = await supabase
      .from("perfis")
      .select("email")
      .eq("id", candidato.parecer_preenchido_por)
      .maybeSingle();
    emailTreinador = (perfilTreinador as { email?: string } | null)?.email ?? null;
  }
  const notasPreenchidas =
    candidato.nota_tecnica !== null &&
    candidato.nota_fisica !== null &&
    candidato.nota_tatica !== null &&
    candidato.nota_comportamental !== null;

  const defaultValues: Record<string, string> = {
    nomeCompleto: candidato.nome_completo,
    dataInicio: candidato.data_inicio ?? "",
    dataTermino: candidato.data_termino ?? "",
    dataNascimento: candidato.data_nascimento ?? "",
    posicao: candidato.posicao ?? "",
    categoria: candidato.categoria ?? "",
    indicacao: candidato.indicacao ?? "",
    clubeAnterior: candidato.clube_anterior ?? "",
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
    rg: candidato.rg ?? "",
    cpf: candidato.cpf ?? "",
    segundaPosicao: candidato.segunda_posicao ?? "",
    peDominante: candidato.pe_dominante ?? "",
    altura: candidato.altura?.toString() ?? "",
    peso: candidato.peso?.toString() ?? "",
    email: candidato.email ?? "",
    possuiPlanoSaude: candidato.possui_plano_saude ? "on" : "",
    planoSaudeQual: candidato.plano_saude_qual ?? "",
    escolaridade: candidato.escolaridade ?? "",
    periodoEscolar: candidato.periodo_escolar ?? "",
    federado: candidato.federado ? "on" : "",
    federadoClube: candidato.federado_clube ?? "",
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

      {candidato.atleta_gerado_id ? (
        <section className="card mt-6 flex flex-wrap items-center justify-between gap-3 border-l-4 border-green-600 p-5">
          <div>
            <p className="text-sm font-semibold text-grena-escuro">Cadastro de atleta criado</p>
            <p className="mt-1 text-sm text-neutral-600">
              Ao ser aprovado, o sistema criou automaticamente o cadastro deste candidato em Atletas
              da Base. Este candidato continua aparecendo normalmente aqui na Captação.
            </p>
          </div>
          {candidato.categoria ? (
            <Link
              href={`/base/atletas/${candidato.categoria}/${candidato.atleta_gerado_id}/ver`}
              className="whitespace-nowrap rounded-md bg-grena px-3 py-1.5 text-sm font-semibold text-white hover:bg-grena/90"
            >
              Ver cadastro do atleta
            </Link>
          ) : null}
        </section>
      ) : null}

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

      {candidato.status !== "inscricao" ? (
        <section className="card mt-4 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Parecer Final de Avaliação</h2>
            <a
              href={`/base/captacao/${candidato.id}/parecer/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-grena px-3 py-1.5 text-sm font-semibold text-white hover:bg-grena/90"
            >
              Gerar Parecer (PDF)
            </a>
          </div>

          {notasPreenchidas ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-neutral-500">Técnica</p>
                  <p className="text-lg font-semibold text-neutral-900">{candidato.nota_tecnica}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Física</p>
                  <p className="text-lg font-semibold text-neutral-900">{candidato.nota_fisica}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Tática</p>
                  <p className="text-lg font-semibold text-neutral-900">{candidato.nota_tatica}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Comportamental</p>
                  <p className="text-lg font-semibold text-neutral-900">{candidato.nota_comportamental}</p>
                </div>
              </div>
              {candidato.parecer_comentarios ? (
                <div>
                  <p className="text-xs font-medium text-neutral-500">Comentários do Treinador</p>
                  <p className="whitespace-pre-line text-sm text-neutral-800">{candidato.parecer_comentarios}</p>
                </div>
              ) : null}
              <p className="text-xs text-neutral-500">
                Preenchido{emailTreinador ? ` por ${emailTreinador}` : ""}
                {candidato.parecer_preenchido_em ? ` em ${formatDataBr(candidato.parecer_preenchido_em)}` : ""}.
                Esse preenchimento é feito pelo Treinador, na tela dele — aqui é só consulta.
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-600">
              O Treinador ainda não preencheu as notas deste candidato. O PDF pode ser gerado a
              qualquer momento, mas sai em branco até o preenchimento.
            </p>
          )}

          {papeisParecer.length > 0 ? (
            <BlocoAssinaturaDigital
              tipoDocumento="parecer_captacao_base"
              documentoId={candidato.id}
              caminhoRevalidar={`/base/captacao/${candidato.id}`}
              papeis={papeisParecer}
              assinaturas={assinaturas}
              papeisQuePossoAssinar={papeisQuePossoAssinar}
            />
          ) : null}
        </section>
      ) : null}

      <section className="card mt-4 space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Documentos</h2>
        <p className="text-sm text-neutral-600">
          Os 5 documentos obrigatórios da ficha, enviados pelo próprio candidato na inscrição — a
          foto fica no formulário abaixo, junto com os demais dados.
        </p>
        <div className="space-y-2">
          {documentos.map((doc) => (
            <div
              key={doc.tipo}
              className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="min-w-[220px] flex-1 font-medium text-neutral-800">{doc.label}</span>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Abrir
                </a>
              ) : (
                <span className="text-xs font-medium text-neutral-400">Não enviado</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="card mt-4 p-6">
        <CaptacaoForm
          action={atualizarAction}
          entityId={candidato.id}
          defaultValues={defaultValues}
          fotoUrl={fotoUrl}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
