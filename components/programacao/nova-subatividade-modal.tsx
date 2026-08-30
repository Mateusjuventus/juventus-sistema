"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { ModalShell } from "./modal";
import { useFecharAoSalvar } from "./use-fechar-ao-salvar";
import { SubmitButton } from "@/components/submit-button";
import { TextField, TextAreaField, SelectField } from "@/components/fields";
import { criarSubatividade, type ProgramacaoFormState } from "@/lib/programacao/actions";
import {
  POSICOES_VALENCIA,
  METODOS_TREINO,
  configVazio,
  type SubatividadeConfig,
} from "@/lib/programacao/subatividade-config";
import type { ProgramacaoCatalogoSubatividadeRow } from "@/lib/supabase/types";

const ESTADO_INICIAL: ProgramacaoFormState = {};

function ConfigNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </div>
  );
}

function ConfigSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {label} — {value}%
      </label>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-grena"
      />
    </div>
  );
}

/**
 * "+ Nova Subatividade", dentro do detalhe de uma atividade (ver mockup aprovado). Só nome,
 * duração em blocos, intervalo, vídeo e observações viram coluna de verdade — o resto (regras,
 * dimensões, orientações por posição, sliders de conteúdo, métodos de treinamento) vai serializado
 * em `config` (ver spec, "Por que config jsonb"). "Importar" prefila os campos a partir de um item
 * do catálogo da categoria, sem criar nenhum vínculo com ele (ver spec, "Catálogo não é modificado
 * ao ser usado") — mudar os campos depois de importar não afeta o item original.
 */
export function NovaSubatividadeModal({
  atividadeId,
  atividadeNome,
  catalogo,
  onClose,
}: {
  atividadeId: string;
  atividadeNome: string;
  catalogo: ProgramacaoCatalogoSubatividadeRow[];
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(criarSubatividade, ESTADO_INICIAL);
  useFecharAoSalvar(state, onClose);

  const [versaoImportacao, setVersaoImportacao] = useState(0);
  const [valoresIniciais, setValoresIniciais] = useState({
    nome: "",
    duracaoBlocos: "",
    intervaloMin: "",
    videoUrl: "",
    observacoes: "",
  });
  const [config, setConfig] = useState<SubatividadeConfig>(configVazio());

  function aoImportar(catalogoId: string) {
    const item = catalogo.find((c) => c.id === catalogoId);
    setValoresIniciais({
      nome: item?.nome ?? "",
      duracaoBlocos: item?.duracao_blocos != null ? String(item.duracao_blocos) : "",
      intervaloMin: item?.intervalo_min != null ? String(item.intervalo_min) : "",
      videoUrl: item?.video_url ?? "",
      observacoes: item?.observacoes ?? "",
    });
    const configImportado = (item?.config ?? null) as Partial<SubatividadeConfig> | null;
    setConfig({ ...configVazio(), ...(configImportado ?? {}) });
    // Muda a `key` dos campos abaixo pra forçar o React a remontá-los com o novo `defaultValue` —
    // são campos não controlados (mesmo padrão de `components/fields.tsx` no resto do sistema).
    setVersaoImportacao((v) => v + 1);
  }

  return (
    <ModalShell titulo="Nova Subatividade" subtitulo={atividadeNome} onClose={onClose} maxWidthClassName="max-w-2xl">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="atividadeId" value={atividadeId} />
        <input type="hidden" name="config" value={JSON.stringify(config)} />

        <TextField
          key={`nome-${versaoImportacao}`}
          label="Nome da subatividade"
          name="nome"
          required
          defaultValue={valoresIniciais.nome}
          error={state.fieldErrors?.nome}
        />

        {catalogo.length > 0 ? (
          <SelectField label="Importar do catálogo desta categoria?" name="_importar" onChange={aoImportar}>
            <option value="">Não — começar em branco</option>
            {catalogo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </SelectField>
        ) : null}

        <div>
          <label className="field-label">Regras</label>
          <textarea
            rows={2}
            value={config.regras}
            onChange={(e) => setConfig((a) => ({ ...a, regras: e.target.value }))}
            className="field-input"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ConfigNumberField
            label="Largura do campo (m)"
            value={config.larguraCampo}
            onChange={(v) => setConfig((a) => ({ ...a, larguraCampo: v }))}
          />
          <ConfigNumberField
            label="Profundidade do campo (m)"
            value={config.profundidadeCampo}
            onChange={(v) => setConfig((a) => ({ ...a, profundidadeCampo: v }))}
          />
          <ConfigNumberField
            label="Atletas por campo"
            value={config.atletasPorCampo}
            onChange={(v) => setConfig((a) => ({ ...a, atletasPorCampo: v }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField
            key={`blocos-${versaoImportacao}`}
            label="Número de blocos"
            name="duracaoBlocos"
            type="number"
            defaultValue={valoresIniciais.duracaoBlocos}
            error={state.fieldErrors?.duracaoBlocos}
          />
          <div className="grid grid-cols-2 gap-2">
            <ConfigNumberField
              label="Duração do bloco (min)"
              value={config.duracaoBlocoMin}
              onChange={(v) => setConfig((a) => ({ ...a, duracaoBlocoMin: v }))}
            />
            <ConfigNumberField
              label="(seg)"
              value={config.duracaoBlocoSeg}
              onChange={(v) => setConfig((a) => ({ ...a, duracaoBlocoSeg: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              key={`intervalo-${versaoImportacao}`}
              label="Intervalo (min)"
              name="intervaloMin"
              type="number"
              defaultValue={valoresIniciais.intervaloMin}
              error={state.fieldErrors?.intervaloMin}
            />
            <ConfigNumberField
              label="(seg)"
              value={config.intervaloSeg}
              onChange={(v) => setConfig((a) => ({ ...a, intervaloSeg: v }))}
            />
          </div>
        </div>

        <TextField
          key={`video-${versaoImportacao}`}
          label="URL do vídeo"
          name="videoUrl"
          placeholder="https://..."
          defaultValue={valoresIniciais.videoUrl}
          error={state.fieldErrors?.videoUrl}
        />

        <div>
          <label className="field-label">Orientações por posição</label>
          <textarea
            rows={2}
            value={config.orientacoes}
            onChange={(e) => setConfig((a) => ({ ...a, orientacoes: e.target.value }))}
            className="field-input"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-grena">Conteúdos e valências</p>
          <div className="flex flex-wrap gap-2">
            {POSICOES_VALENCIA.map((p) => {
              const ativo = config.posicoes[p.key];
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setConfig((a) => ({ ...a, posicoes: { ...a.posicoes, [p.key]: !a.posicoes[p.key] } }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ativo ? "border-grena bg-grena/10 text-grena" : "border-linha bg-white text-neutral-500"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <ConfigSlider label="Conteúdo Físico" value={config.fisico} onChange={(v) => setConfig((a) => ({ ...a, fisico: v }))} />
          <ConfigSlider label="Conteúdo Tático" value={config.tatico} onChange={(v) => setConfig((a) => ({ ...a, tatico: v }))} />
          <ConfigSlider label="Conteúdo Técnico" value={config.tecnico} onChange={(v) => setConfig((a) => ({ ...a, tecnico: v }))} />
          <ConfigSlider
            label="Conteúdo Comportamental"
            value={config.comportamental}
            onChange={(v) => setConfig((a) => ({ ...a, comportamental: v }))}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-grena">Método de treinamento</p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS_TREINO.map((m) => {
              const ativo = config.metodos[m.key];
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setConfig((a) => ({ ...a, metodos: { ...a.metodos, [m.key]: !a.metodos[m.key] } }))}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    ativo ? "border-grena bg-grena/5 text-grena-escuro" : "border-linha bg-white text-neutral-600"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      ativo ? "border-grena bg-grena" : "border-neutral-300 bg-white"
                    }`}
                  >
                    {ativo ? <span className="text-[10px] leading-none text-white">✓</span> : null}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <TextAreaField
          key={`observacoes-${versaoImportacao}`}
          label="Observações"
          name="observacoes"
          defaultValue={valoresIniciais.observacoes}
          rows={2}
        />

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="salvarNoCatalogo" className="h-4 w-4 rounded border-linha accent-grena" />
          Criar novas regras de subatividade (salvar no catálogo desta categoria)
        </label>

        {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-linha pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <SubmitButton label="Salvar subatividade" pendingLabel="Salvando..." />
        </div>
      </form>
    </ModalShell>
  );
}
