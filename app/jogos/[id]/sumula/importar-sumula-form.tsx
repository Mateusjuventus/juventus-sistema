"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarPreviaImportacaoSumula,
  confirmarImportacaoSumula,
  type ConfirmacaoEvento,
  type PreviaImportacaoSumula,
} from "./importar-actions";
import type { SumulaEventoTipo } from "@/lib/supabase/types";

export interface AtletaOpcao {
  id: string;
  nome: string;
}

const TIPO_EVENTO_LABEL: Record<SumulaEventoTipo, string> = {
  gol: "⚽ Gol",
  cartao_amarelo: "🟨 Cartão amarelo",
  cartao_vermelho: "🟥 Cartão vermelho",
  substituicao: "🔄 Substituição",
};

function SeletorAtleta({
  valor,
  onChange,
  atletas,
}: {
  valor: string | null;
  onChange: (id: string | null) => void;
  atletas: AtletaOpcao[];
}) {
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="field-input text-sm"
    >
      <option value="">Não vincular / ignorar</option>
      {atletas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nome}
        </option>
      ))}
    </select>
  );
}

export function ImportarSumulaForm({
  jogoId,
  mandante,
  atletasConvocados,
}: {
  jogoId: string;
  mandante: boolean;
  atletasConvocados: AtletaOpcao[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [buscando, startBusca] = useTransition();
  const [confirmando, startConfirmacao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacaoSumula | null>(null);
  const [eventos, setEventos] = useState<ConfirmacaoEvento[]>([]);
  const [golsPro, setGolsPro] = useState<string>("");
  const [golsContra, setGolsContra] = useState<string>("");
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  function buscar() {
    setErro(null);
    setMensagemSucesso(null);
    startBusca(async () => {
      const resultado = await buscarPreviaImportacaoSumula(jogoId, url);
      if (resultado.erro || !resultado.dados) {
        setErro(resultado.erro ?? "Não foi possível ler a súmula.");
        setPrevia(null);
        return;
      }
      const dados = resultado.dados;
      setPrevia(dados);
      setEventos(
        dados.eventos.map((e) => ({
          tipo: e.tipo,
          minuto: e.minuto,
          tempo: e.tempo,
          atletaId: e.atletaId,
          atletaEntrouId: e.atletaEntrouId,
          nomeAdversario: e.nomeAdversario,
          incluido: true,
        })),
      );

      // O placar da súmula vem na ordem mandante/visitante DA PARTIDA — usa se veio (mais
      // confiável), senão cai pra contagem de linhas de gol encontradas.
      const golsJuventus =
        dados.placarMandante != null && dados.placarVisitante != null
          ? mandante
            ? dados.placarMandante
            : dados.placarVisitante
          : dados.golsJuventusContagem;
      const golsAdversario =
        dados.placarMandante != null && dados.placarVisitante != null
          ? mandante
            ? dados.placarVisitante
            : dados.placarMandante
          : dados.golsAdversarioContagem;
      setGolsPro(String(golsJuventus));
      setGolsContra(String(golsAdversario));
    });
  }

  function confirmar() {
    setErro(null);
    startConfirmacao(async () => {
      const resultado = await confirmarImportacaoSumula({
        jogoId,
        linkPdf: previa?.linkPdf ?? url.trim(),
        golsPro: golsPro.trim() ? Number(golsPro) : null,
        golsContra: golsContra.trim() ? Number(golsContra) : null,
        eventos,
      });
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setMensagemSucesso(`Importado: ${resultado.eventosImportados ?? 0} evento(s) na súmula.`);
      setPrevia(null);
      router.refresh();
    });
  }

  return (
    <section className="card p-4">
      <h2 className="text-lg font-bold text-grena-escuro">Importar da súmula oficial (PDF)</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Cole o link do PDF da súmula publicada pela FPF (o mesmo domínio das súmulas de jogadores —
        diferente do site que está bloqueando nosso servidor) e a gente lê e sugere o preenchimento
        do placar e dos eventos, usando os atletas já convocados nesse jogo. Você revisa e confirma
        antes de salvar.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[320px] flex-1">
          <label className="field-label">Link do PDF da súmula</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://conteudo.fpf.org.br/sumulas/..."
            className="field-input"
          />
        </div>
        <button type="button" className="btn-primary" disabled={buscando || !url.trim()} onClick={buscar}>
          {buscando ? "Lendo súmula..." : "Buscar dados da súmula"}
        </button>
      </div>

      {erro ? <p className="field-error mt-2">{erro}</p> : null}
      {mensagemSucesso ? <p className="mt-2 text-sm font-medium text-green-700">{mensagemSucesso}</p> : null}

      {previa ? (
        <div className="mt-4 space-y-4 border-t border-neutral-200 pt-4">
          <div className="text-sm text-neutral-600">
            {previa.competicao ? <p>Competição: {previa.competicao}</p> : null}
            {previa.rodada ? <p>Rodada: {previa.rodada}</p> : null}
            {previa.data ? <p>Data na súmula: {previa.data}</p> : null}
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label className="field-label">Placar sugerido — Juventus</label>
              <input
                type="number"
                min={0}
                value={golsPro}
                onChange={(e) => setGolsPro(e.target.value)}
                className="field-input w-20"
              />
            </div>
            <span className="pb-2 text-neutral-400">×</span>
            <div>
              <label className="field-label">Adversário</label>
              <input
                type="number"
                min={0}
                value={golsContra}
                onChange={(e) => setGolsContra(e.target.value)}
                className="field-input w-20"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-grena-escuro">Eventos encontrados ({eventos.length})</h3>
            <div className="mt-2 space-y-1">
              {eventos.map((evento, i) => (
                <div
                  key={i}
                  className={`flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-sm ${evento.incluido ? "bg-neutral-50" : "bg-neutral-100 opacity-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={evento.incluido}
                    onChange={(e) =>
                      setEventos((prev) => prev.map((ev, idx) => (idx === i ? { ...ev, incluido: e.target.checked } : ev)))
                    }
                    title="Incluir esse evento na importação"
                  />
                  <span className="w-14 shrink-0 font-semibold text-grena-escuro">{evento.minuto}&apos;</span>
                  <span className="w-40 shrink-0 text-neutral-700">
                    {evento.nomeAdversario ? "⚽ Gol (adversário)" : TIPO_EVENTO_LABEL[evento.tipo]}
                  </span>

                  {evento.nomeAdversario ? (
                    <span className="text-neutral-600">{evento.nomeAdversario}</span>
                  ) : (
                    <>
                      <span className="text-xs text-neutral-400">
                        {evento.tipo === "substituicao" ? "Saiu" : "Atleta"}
                      </span>
                      <SeletorAtleta
                        valor={evento.atletaId}
                        atletas={atletasConvocados}
                        onChange={(id) =>
                          setEventos((prev) => prev.map((e, idx) => (idx === i ? { ...e, atletaId: id } : e)))
                        }
                      />
                      {evento.tipo === "substituicao" ? (
                        <>
                          <span className="text-xs text-neutral-400">Entrou</span>
                          <SeletorAtleta
                            valor={evento.atletaEntrouId}
                            atletas={atletasConvocados}
                            onChange={(id) =>
                              setEventos((prev) => prev.map((e, idx) => (idx === i ? { ...e, atletaEntrouId: id } : e)))
                            }
                          />
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              {eventos.length === 0 ? (
                <p className="text-sm text-neutral-400">Nenhum evento foi identificado nessa súmula.</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-neutral-200 pt-3">
            <button type="button" className="btn-primary" disabled={confirmando} onClick={confirmar}>
              {confirmando ? "Salvando..." : "Confirmar e importar"}
            </button>
            <p className="text-xs text-neutral-400">
              Isso substitui os eventos já lançados nesse jogo pelos dados confirmados acima. Desmarque a
              caixinha de um evento pra não importar ele.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
