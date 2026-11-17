"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

export interface ContatoEmergenciaFormState {
  error?: string;
  success?: boolean;
}

export interface ContatoRapido {
  nome: string;
  telefone: string;
}

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar contato"}
    </button>
  );
}

function TipoChip({
  selecionado,
  onClick,
  children,
}: {
  selecionado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className={
        selecionado
          ? "rounded-full border border-grena bg-grena px-3 py-1 text-sm font-medium text-white"
          : "rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium text-neutral-700 hover:border-grena"
      }
    >
      {children}
    </button>
  );
}

/**
 * Mini-formulário de "+ Adicionar contato" (Nome/Parentesco/Contato) — lista de contatos de
 * emergência do atleta, compartilhado por Profissional e Base (ver docs/superpowers/specs/
 * 2026-10-16-atleta-dados-pessoais-design.md). Mesmo padrão de `DocumentoForm`
 * (app/atletas/[id]/documentacao/documento-form.tsx), sem upload de arquivo: usa `key` pra limpar
 * os campos depois de um envio com sucesso.
 *
 * `camposExtras`: campos escondidos adicionais (ex.: `atletaId`, e na Base também `categoria`, pra
 * a action saber qual caminho revalidar).
 *
 * `contatoMae`/`contatoPai`: pedido do Mateus em 17/11/2026 — como o cadastro do atleta já tem
 * nome/telefone da mãe e do pai (campos "Base-only", ver `atletaSchema`), não faz sentido digitar
 * tudo de novo só pra registrar um deles como contato de emergência. Quando pelo menos um dos dois
 * já está preenchido, aparecem chips "Mãe"/"Pai" pra adicionar direto (nome/parentesco/contato
 * vão escondidos, sem campo nenhum pra preencher) — só o chip "Outro" continua abrindo os 3 campos
 * de texto livre de sempre. Sem nenhum dos dois cadastrados (ex.: atleta Profissional), os chips
 * nem aparecem e o mini-formulário se comporta exatamente como antes.
 */
export function ContatoEmergenciaForm({
  action,
  camposExtras,
  contatoMae,
  contatoPai,
}: {
  action: (prevState: ContatoEmergenciaFormState, formData: FormData) => Promise<ContatoEmergenciaFormState>;
  camposExtras?: Record<string, string>;
  contatoMae?: ContatoRapido | null;
  contatoPai?: ContatoRapido | null;
}) {
  const [state, formAction] = useFormState(action, {});
  const [formKey, setFormKey] = useState(0);
  const temAtalho = Boolean(contatoMae || contatoPai);
  const [tipo, setTipo] = useState<"mae" | "pai" | "outro">(contatoMae ? "mae" : contatoPai ? "pai" : "outro");

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
      setTipo(contatoMae ? "mae" : contatoPai ? "pai" : "outro");
    }
    // Só depois de um envio com sucesso — não queremos resetar o chip escolhido a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div>
      {temAtalho ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {contatoMae ? (
            <TipoChip selecionado={tipo === "mae"} onClick={() => setTipo("mae")}>
              Mãe
            </TipoChip>
          ) : null}
          {contatoPai ? (
            <TipoChip selecionado={tipo === "pai"} onClick={() => setTipo("pai")}>
              Pai
            </TipoChip>
          ) : null}
          <TipoChip selecionado={tipo === "outro"} onClick={() => setTipo("outro")}>
            Outro
          </TipoChip>
        </div>
      ) : null}

      <form
        key={`${formKey}-${tipo}`}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
      >
        {camposExtras
          ? Object.entries(camposExtras).map(([nome, valor]) => (
              <input key={nome} type="hidden" name={nome} value={valor} />
            ))
          : null}

        {tipo === "mae" && contatoMae ? (
          <>
            <input type="hidden" name="nome" value={contatoMae.nome} />
            <input type="hidden" name="parentesco" value="Mãe" />
            <input type="hidden" name="contato" value={contatoMae.telefone} />
            <p className="flex-1 text-sm text-neutral-700">
              <span className="font-medium text-neutral-800">{contatoMae.nome}</span> — Mãe
              {contatoMae.telefone ? ` · ${contatoMae.telefone}` : null}
            </p>
          </>
        ) : tipo === "pai" && contatoPai ? (
          <>
            <input type="hidden" name="nome" value={contatoPai.nome} />
            <input type="hidden" name="parentesco" value="Pai" />
            <input type="hidden" name="contato" value={contatoPai.telefone} />
            <p className="flex-1 text-sm text-neutral-700">
              <span className="font-medium text-neutral-800">{contatoPai.nome}</span> — Pai
              {contatoPai.telefone ? ` · ${contatoPai.telefone}` : null}
            </p>
          </>
        ) : (
          <>
            <div className="min-w-[180px] flex-1">
              <label className="field-label">Nome</label>
              <input type="text" name="nome" required className="field-input" />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="field-label">Parentesco</label>
              <input type="text" name="parentesco" className="field-input" />
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="field-label">Contato</label>
              <input type="text" name="contato" className="field-input" />
            </div>
          </>
        )}

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
