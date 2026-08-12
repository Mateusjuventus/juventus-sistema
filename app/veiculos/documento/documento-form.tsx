"use client";

import { useState } from "react";
import { descricaoVeiculo, formatPlaca, ordenarPorCondutor } from "@/lib/futebol/veiculo";
import type { VeiculoRow } from "@/lib/supabase/types";

export interface JogoOpcao {
  id: string;
  adversarioNome: string;
  competicao: string;
  dataJogo: string;
  horario: string | null;
  localEstadio: string | null;
  endereco: string | null;
  mandante: boolean;
}

/**
 * Monta o ofício de liberação de acesso: escolhe os veículos e para onde/quando vai.
 *
 * É um `form method="get"` que abre a rota de PDF em outra aba — não grava nada. O documento é
 * gerado sob demanda a partir do cadastro; guardar cada emissão viraria um histórico que ninguém
 * pediu e que envelheceria mal (o veículo muda, o ofício antigo não deveria mudar junto).
 *
 * Escolher um jogo preenche evento, data, horário e local — os campos seguem editáveis, porque
 * quem recebe o ofício às vezes é o CT do adversário, e não o estádio.
 */
export function DocumentoVeiculosForm({ veiculos, jogos }: { veiculos: VeiculoRow[]; jogos: JogoOpcao[] }) {
  const lista = ordenarPorCondutor(veiculos);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [evento, setEvento] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");

  const alternar = (id: string) => {
    setSelecionados((atual) => {
      const copia = new Set(atual);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  const escolherJogo = (jogoId: string) => {
    const jogo = jogos.find((j) => j.id === jogoId);
    if (!jogo) return;
    setEvento(`${jogo.mandante ? "Juventus" : jogo.adversarioNome} x ${jogo.mandante ? jogo.adversarioNome : "Juventus"} — ${jogo.competicao}`);
    setData(jogo.dataJogo);
    setHorario(jogo.horario ?? "");
    setLocal([jogo.localEstadio, jogo.endereco].filter(Boolean).join(" — "));
  };

  const nenhumSelecionado = selecionados.size === 0;

  return (
    <form action="/veiculos/documento/pdf" method="get" target="_blank" className="mt-6 space-y-5">
      <section className="card space-y-4 p-6">
        <h2 className="text-base font-bold text-grena-escuro">Para onde vai o documento</h2>

        {jogos.length > 0 ? (
          <div>
            <label htmlFor="jogo" className="field-label">
              Preencher a partir de um jogo
            </label>
            <select id="jogo" className="field-input" defaultValue="" onChange={(e) => escolherJogo(e.target.value)}>
              <option value="">— escolher um jogo —</option>
              {jogos.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.dataJogo.split("-").reverse().join("/")} · {j.mandante ? "Juventus x " : ""}
                  {j.adversarioNome}
                  {j.mandante ? "" : " x Juventus"} · {j.competicao}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="destinatario" className="field-label">
            Destinatário
          </label>
          <input
            id="destinatario"
            name="destinatario"
            className="field-input"
            placeholder="Ex.: À Coordenação de Segurança do Estádio Municipal Prefeito José Liberatti"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="evento" className="field-label">
              Evento / jogo
            </label>
            <input
              id="evento"
              name="evento"
              className="field-input"
              placeholder="Ex.: Oeste x Juventus — Copa Paulista"
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="data" className="field-label">
              Data
            </label>
            <input
              id="data"
              name="data"
              type="date"
              className="field-input"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="horario" className="field-label">
              Horário
            </label>
            <input
              id="horario"
              name="horario"
              className="field-input"
              placeholder="Ex.: 15h00"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="local" className="field-label">
              Local
            </label>
            <input
              id="local"
              name="local"
              className="field-input"
              placeholder="Ex.: Estádio Municipal Prefeito José Liberatti, Barueri/SP"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="responsavelNome" className="field-label">
              Assina o documento
            </label>
            <input id="responsavelNome" name="responsavelNome" className="field-input" placeholder="Nome" />
          </div>
          <div>
            <label htmlFor="responsavelFuncao" className="field-label">
              Função de quem assina
            </label>
            <input
              id="responsavelFuncao"
              name="responsavelFuncao"
              className="field-input"
              placeholder="Ex.: Gerente de Futebol"
            />
          </div>
        </div>

        <div>
          <label htmlFor="observacoes" className="field-label">
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={2}
            className="field-input"
            placeholder="Ex.: os veículos chegam a partir das 12h pelo portão 3"
          />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-5 py-4">
          <h2 className="text-base font-bold text-grena-escuro">
            Veículos no documento{" "}
            <span className="text-sm font-medium text-neutral-500">({selecionados.size} selecionados)</span>
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setSelecionados(new Set(lista.map((v) => v.id)))}
            >
              Selecionar todos
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setSelecionados(new Set())}>
              Limpar
            </button>
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="px-5 py-8 text-center text-neutral-400">
            Nenhum veículo ativo cadastrado — cadastre antes de gerar o documento.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {lista.map((v) => {
              const marcado = selecionados.has(v.id);
              return (
                <li key={v.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      name="ids"
                      value={v.id}
                      checked={marcado}
                      onChange={() => alternar(v.id)}
                      className="h-4 w-4 accent-grena"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-neutral-800">{v.nome}</span>
                      <span className="block text-xs text-neutral-500">
                        {descricaoVeiculo(v)}
                        {v.documento ? ` · ${v.documento}` : ""}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-semibold tracking-wide text-grena-escuro">
                      {formatPlaca(v.placa)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-end gap-3">
        {nenhumSelecionado ? (
          <span className="text-sm text-neutral-400">Selecione ao menos um veículo.</span>
        ) : null}
        <button type="submit" className="btn-primary" disabled={nenhumSelecionado}>
          Gerar documento em PDF
        </button>
      </div>
    </form>
  );
}
