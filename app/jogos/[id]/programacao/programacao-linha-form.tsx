"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}

/**
 * Formulário de adicionar uma linha de cronograma (horário, atividade, local). Na seção Dia de
 * Jogo (`mostrarConfronto`), existe o checkbox "Esta linha é o confronto" — quando marcado, o
 * campo de atividade fica desabilitado (o pôster preenche sozinho a partir do adversário/mandante
 * do jogo, ver `lib/posters/jogo-texto.ts`).
 */
export function ProgramacaoLinhaForm({
  action,
  jogoId,
  tipo,
  mostrarConfronto,
  confrontoTexto,
}: {
  action: (formData: FormData) => Promise<void>;
  jogoId: string;
  tipo: "concentracao" | "dia_jogo";
  mostrarConfronto?: boolean;
  confrontoTexto?: string;
}) {
  const [ehConfronto, setEhConfronto] = useState(false);
  const [atividade, setAtividade] = useState("");

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
    >
      <input type="hidden" name="jogoId" value={jogoId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <label className="field-label">Horário</label>
        <input
          type="text"
          name="horario"
          placeholder="Ex.: 12:00"
          required
          className="field-input w-28"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="field-label">Atividade</label>
        <input
          type="text"
          name="atividade"
          placeholder="Ex.: Almoço"
          required={!ehConfronto}
          disabled={ehConfronto}
          value={ehConfronto ? confrontoTexto ?? "" : atividade}
          onChange={(e) => setAtividade(e.target.value)}
          className="field-input disabled:bg-neutral-100 disabled:text-neutral-500"
        />
      </div>

      <div className="min-w-[140px] flex-1">
        <label className="field-label">Local</label>
        <input type="text" name="local" placeholder="Ex.: Javari" required className="field-input" />
      </div>

      {mostrarConfronto ? (
        <label className="mb-2 flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="ehConfronto"
            checked={ehConfronto}
            onChange={(e) => setEhConfronto(e.target.checked)}
          />
          Esta linha é o confronto
        </label>
      ) : null}

      <AdicionarButton />
    </form>
  );
}
