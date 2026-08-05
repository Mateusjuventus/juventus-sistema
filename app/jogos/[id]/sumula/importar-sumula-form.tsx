"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarPreviaImportacaoSumula,
  confirmarImportacaoSumula,
  type ConfirmacaoEvento,
  type ConfirmacaoJogador,
  type PreviaImportacaoSumula,
} from "./importar-actions";
import type { SumulaEventoTipo } from "@/lib/supabase/types";

export interface AtletaOpcao {
  id: string;
  nome: string;
}

const CONFIANCA_LABEL: Record<string, string> = {
  numero_fpf: "número FPF confere",
  nome_exato: "nome idêntico",
  nome_aproximado: "nome parecido — confira",
  nenhuma: "sem sugestão — selecione",
};

const CONFIANCA_COR: Record<string, string> = {
  numero_fpf: "bg-green-100 text-green-800",
  nome_exato: "bg-green-100 text-green-800",
  nome_aproximado: "bg-amber-100 text-amber-800",
  nenhuma: "bg-neutral-200 text-neutral-600",
};

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

export function ImportarSumulaForm({ jogoId, atletas }: { jogoId: string; atletas: AtletaOpcao[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [buscando, startBusca] = useTransition();
  const [confirmando, startConfirmacao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacaoSumula | null>(null);
  const [jogadores, setJogadores] = useState<ConfirmacaoJogador[]>([]);
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
      setJogadores(
        dados.jogadores.map((j) => ({
          numero: j.numero,
          nome: j.nome,
          titular: j.titular,
          atletaId: j.atletaSugeridoId,
        })),
      );
      setEventos(
        dados.eventos.map((e) => ({
          tipo: e.tipo,
          minuto: e.minuto,
          tempo: e.tempo,
          atletaId: e.atletaId,
          atletaEntrouId: e.atletaEntrouId,
        })),
      );
      setGolsPro(dados.placarMandante != null ? String(dados.placarMandante) : "");
      setGolsContra(dados.placarVisitante != null ? String(dados.placarVisitante) : "");
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
        jogadores,
        eventos,
      });
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setMensagemSucesso(
        `Importado: ${resultado.jogadoresImportados ?? 0} jogador(es) na escalação e ${resultado.eventosImportados ?? 0} evento(s) na súmula.`,
      );
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
        do placar, escalação e eventos. Você revisa e confirma antes de salvar.
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

          {previa.avisos.length > 0 ? (
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">
                {previa.avisos.length} observação(ões) — algo pode precisar de ajuste manual:
              </p>
              <ul className="mt-1 list-disc pl-4">
                {previa.avisos.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

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
            <p className="pb-2 text-xs text-neutral-400">Confira — o lado (mandante/visitante) é decidido por você aqui.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-grena-escuro">
              Jogadores encontrados na súmula ({jogadores.length})
            </h3>
            <div className="mt-2 space-y-1">
              {jogadores.map((jogador, i) => {
                const confianca = previa.jogadores[i]?.confianca ?? "nenhuma";
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm">
                    <span className="w-8 shrink-0 text-center font-semibold text-neutral-500">
                      #{jogador.numero}
                    </span>
                    <span className="w-14 shrink-0 text-xs font-medium text-neutral-500">
                      {jogador.titular ? "Titular" : "Reserva"}
                    </span>
                    <span className="min-w-[180px] flex-1 text-neutral-800">{jogador.nome}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CONFIANCA_COR[confianca]}`}>
                      {CONFIANCA_LABEL[confianca]}
                    </span>
                    <SeletorAtleta
                      valor={jogador.atletaId}
                      atletas={atletas}
                      onChange={(id) =>
                        setJogadores((prev) => prev.map((j, idx) => (idx === i ? { ...j, atletaId: id } : j)))
                      }
                    />
                  </div>
                );
              })}
              {jogadores.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Nenhum jogador do seu elenco foi encontrado na relação de jogadores dessa súmula.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-grena-escuro">Eventos encontrados ({eventos.length})</h3>
            <div className="mt-2 space-y-1">
              {eventos.map((evento, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm">
                  <span className="w-14 shrink-0 font-semibold text-grena-escuro">{evento.minuto}&apos;</span>
                  <span className="w-40 shrink-0 text-neutral-700">{TIPO_EVENTO_LABEL[evento.tipo]}</span>
                  <span className="text-xs text-neutral-400">
                    {evento.tipo === "substituicao" ? "Saiu" : "Atleta"}
                  </span>
                  <SeletorAtleta
                    valor={evento.atletaId}
                    atletas={atletas}
                    onChange={(id) =>
                      setEventos((prev) => prev.map((e, idx) => (idx === i ? { ...e, atletaId: id } : e)))
                    }
                  />
                  {evento.tipo === "substituicao" ? (
                    <>
                      <span className="text-xs text-neutral-400">Entrou</span>
                      <SeletorAtleta
                        valor={evento.atletaEntrouId}
                        atletas={atletas}
                        onChange={(id) =>
                          setEventos((prev) => prev.map((e, idx) => (idx === i ? { ...e, atletaEntrouId: id } : e)))
                        }
                      />
                    </>
                  ) : null}
                </div>
              ))}
              {eventos.length === 0 ? (
                <p className="text-sm text-neutral-400">Nenhum evento do Juventus foi identificado nessa súmula.</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-neutral-200 pt-3">
            <button type="button" className="btn-primary" disabled={confirmando} onClick={confirmar}>
              {confirmando ? "Salvando..." : "Confirmar e importar"}
            </button>
            <p className="text-xs text-neutral-400">
              Isso substitui a escalação e os eventos já lançados nesse jogo pelos dados confirmados acima.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
