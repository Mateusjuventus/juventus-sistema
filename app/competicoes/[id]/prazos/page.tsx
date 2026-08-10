import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { getSignedCompeticaoDocumentoUrl } from "@/lib/supabase/storage";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { hojeBrasilia } from "@/lib/data-brasil";
import {
  alternarPrazoConcluido,
  criarPrazo,
  enviarDocumento,
  excluirDocumento,
  excluirPrazo,
} from "../../actions";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Prazos (inscrição, documentação...) e documentos (regulamento, tabelas, comunicados) da
 * competição. Prazo perto de vencer vira alerta sozinho (Mural/Avisos/aba Alertas). */
export default async function CompeticaoPrazosPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, prazos, documentos } = carregada;
  const hojeStr = hojeBrasilia();

  const criarPrazoAction = criarPrazo.bind(null, competicao.id);
  const alternarAction = alternarPrazoConcluido.bind(null, competicao.id);
  const excluirPrazoAction = excluirPrazo.bind(null, competicao.id);
  const enviarDocAction = enviarDocumento.bind(null, competicao.id);
  const excluirDocAction = excluirDocumento.bind(null, competicao.id);

  const documentosComUrl = await Promise.all(
    documentos.map(async (d) => ({
      ...d,
      url: await getSignedCompeticaoDocumentoUrl(supabase, d.arquivo_path),
    })),
  );

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="prazos" />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-base font-bold text-grena-escuro">Prazos</h2>
          <div className="mt-3 space-y-2">
            {prazos.map((p) => {
              const vencido = !p.concluido && p.data_fim < hojeStr;
              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 ${
                    p.concluido ? "border-linha bg-neutral-50 opacity-70" : vencido ? "border-red-200 bg-red-50" : "border-linha"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${p.concluido ? "text-neutral-500 line-through" : "text-neutral-800"}`}>
                      {p.titulo}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {p.data_inicio ? `${formatData(p.data_inicio)} — ` : "até "}
                      {formatData(p.data_fim)}
                      {vencido ? <span className="ml-1 font-semibold text-red-700">· vencido</span> : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={alternarAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                        {p.concluido ? "Reabrir" : "Concluir"}
                      </button>
                    </form>
                    <form action={excluirPrazoAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                        Excluir
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
            {prazos.length === 0 ? <p className="text-sm text-neutral-400">Nenhum prazo cadastrado.</p> : null}
          </div>

          <form action={criarPrazoAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-linha pt-4">
            <div className="min-w-[180px] flex-1">
              <label htmlFor="titulo" className="field-label">
                Novo prazo
              </label>
              <input id="titulo" name="titulo" className="field-input" placeholder="Ex.: Inscrição do Play In" required />
            </div>
            <div>
              <label htmlFor="dataInicio" className="field-label">
                Início (opcional)
              </label>
              <input id="dataInicio" name="dataInicio" type="date" className="field-input" />
            </div>
            <div>
              <label htmlFor="dataFim" className="field-label">
                Fim
              </label>
              <input id="dataFim" name="dataFim" type="date" className="field-input" required />
            </div>
            <button type="submit" className="btn-primary">
              + Prazo
            </button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="text-base font-bold text-grena-escuro">Documentos</h2>
          <div className="mt-3 space-y-2">
            {documentosComUrl.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-linha p-3">
                <div>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-grena hover:underline"
                    >
                      📄 {d.nome}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-neutral-500">📄 {d.nome}</span>
                  )}
                  <p className="text-xs text-neutral-400">Enviado em {formatData(d.created_at.slice(0, 10))}</p>
                </div>
                <form action={excluirDocAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                    Excluir
                  </button>
                </form>
              </div>
            ))}
            {documentosComUrl.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhum documento enviado.</p>
            ) : null}
          </div>

          <form action={enviarDocAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-linha pt-4">
            <div className="min-w-[160px] flex-1">
              <label htmlFor="nome" className="field-label">
                Nome do documento
              </label>
              <input id="nome" name="nome" className="field-input" placeholder="Ex.: Tabela da Primeira Fase" />
            </div>
            <div className="min-w-[200px] flex-1">
              <label htmlFor="arquivo" className="field-label">
                Arquivo
              </label>
              <input id="arquivo" name="arquivo" type="file" className="field-input" required />
            </div>
            <button type="submit" className="btn-primary">
              Enviar
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
