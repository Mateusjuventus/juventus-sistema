"use client";

import { useFormState, useFormStatus } from "react-dom";

/** Estado devolvido pela Server Action — declarado por estrutura pra este componente servir ao
 * Profissional e à Base sem importar de nenhum dos dois. */
export interface AdicionarStaffVagaState {
  error?: string;
  success?: boolean;
}

export interface PessoaSemVaga {
  id: string;
  nome: string;
}

export interface FuncaoAbertaVaga {
  vagaFuncaoId: string;
  funcaoNome: string;
  ocupadas: number;
  quantidade: number;
}

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary text-sm" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar à lista"}
    </button>
  );
}

/**
 * Porta dos fundos pra colocar alguém na lista de vagas sem passar pelo link público — pro caso
 * (já aconteceu uma vez, com a Andressa) de o cadastro estar certinho e ativo mas, por algum
 * motivo fora do nosso controle, a pessoa não aparecer na lista pública pra se inscrever sozinha.
 * Em vez de depender de rodar SQL de novo, o Mateus resolve direto aqui.
 *
 * Escolhe a pessoa e a função/vaga por conta própria, sem tentar casar automaticamente com o
 * cadastro dela — é justamente esse casamento automático que pode falhar. E, igual ao "Chamar" da
 * espera e à troca de função, não trava por limite de vaga: quem decide com a contagem na mão é o
 * Mateus.
 */
export function AdicionarStaffVagaForm({
  action,
  pessoas,
  funcoesAbertas,
}: {
  action: (prevState: AdicionarStaffVagaState, formData: FormData) => Promise<AdicionarStaffVagaState>;
  pessoas: PessoaSemVaga[];
  funcoesAbertas: FuncaoAbertaVaga[];
}) {
  const [state, formAction] = useFormState(action, {} as AdicionarStaffVagaState);

  if (funcoesAbertas.length === 0) return null;

  return (
    <details className="card mt-4 overflow-hidden">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-grena-escuro">
        Adicionar pessoa manualmente
      </summary>
      <div className="border-t border-linha p-4">
        <p className="mb-3 text-xs text-neutral-500">
          Pra quando alguém não aparece na lista pública por algum motivo — coloca a pessoa direto
          aqui, sem depender do link.
        </p>

        {state.error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Pessoa adicionada à lista.
          </p>
        ) : null}

        {pessoas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Todo o Staff Operacional ativo já está nesta lista.
          </p>
        ) : (
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="field-label">Pessoa</label>
              <select name="staffId" className="field-input" required defaultValue="">
                <option value="" disabled>
                  — escolher —
                </option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="field-label">Função / vaga</label>
              <select name="vagaFuncaoId" className="field-input" required defaultValue="">
                <option value="" disabled>
                  — escolher —
                </option>
                {funcoesAbertas.map((f) => (
                  <option key={f.vagaFuncaoId} value={f.vagaFuncaoId}>
                    {f.funcaoNome} ({f.ocupadas}/{f.quantidade})
                  </option>
                ))}
              </select>
            </div>
            <AdicionarButton />
          </form>
        )}
      </div>
    </details>
  );
}
