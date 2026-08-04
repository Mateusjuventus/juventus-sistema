"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { corCategoriaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import type { AtletaRow, ComissaoTecnicaRow } from "@/lib/supabase/types";
import type { ConvocacaoFormState } from "./actions";

const initialState: ConvocacaoFormState = {};

type AtletaComFoto = AtletaRow & { fotoUrl: string | null };

/** Duas letras pra usar como avatar quando o atleta não tem foto cadastrada — mesmo espírito do
 * fallback já usado em outras telas (ex.: card de próximo jogo na tela inicial). */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function Avatar({ atleta, className = "h-10 w-10" }: { atleta: AtletaComFoto; className?: string }) {
  if (atleta.fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={atleta.fotoUrl}
        alt={atleta.nome_completo}
        className={`${className} shrink-0 rounded-full border border-neutral-200 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-xs font-semibold text-neutral-500`}
    >
      {iniciais(atleta.nome_completo)}
    </div>
  );
}

function TagPosicao({ atleta }: { atleta: AtletaComFoto }) {
  return (
    <span
      className={`inline-flex w-11 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${corCategoriaPosicao(atleta.categoria_posicao)}`}
    >
      {siglaCategoriaPosicao(atleta.categoria_posicao)}
    </span>
  );
}

/**
 * Cartão de um atleta na grade de "Atletas Disponíveis" — clicar convoca (adiciona à lista de
 * Convocados abaixo, como reserva por padrão).
 */
function CartaoAtletaDisponivel({ atleta, onClick }: { atleta: AtletaComFoto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex items-center gap-2 p-2.5 text-left transition-colors hover:border-grena hover:bg-grena/5"
    >
      <Avatar atleta={atleta} className="h-9 w-9" />
      <TagPosicao atleta={atleta} />
      <span className="truncate text-sm font-medium text-neutral-800">
        {atleta.apelido || atleta.nome_completo}
      </span>
    </button>
  );
}

/** Linha de um atleta já convocado — checkbox de titular e X pra remover. */
function LinhaConvocado({
  atleta,
  titular,
  onToggleTitular,
  onRemover,
}: {
  atleta: AtletaComFoto;
  titular: boolean;
  onToggleTitular: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-2.5">
      <Avatar atleta={atleta} />
      <TagPosicao atleta={atleta} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-800">
          {atleta.apelido || atleta.nome_completo}
        </p>
        <label className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={titular}
            onChange={onToggleTitular}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-grena focus:ring-grena"
          />
          atleta titular
        </label>
      </div>
      <span className="shrink-0 text-xs font-medium text-neutral-400">
        {atleta.numero_camisa ? `Nº ${atleta.numero_camisa}` : "Sem número"}
      </span>
      <button
        type="button"
        onClick={onRemover}
        aria-label={`Remover ${atleta.nome_completo} da convocação`}
        className="shrink-0 text-neutral-400 transition-colors hover:text-red-600"
      >
        ✕
      </button>
    </div>
  );
}

export function ConvocacaoForm({
  action,
  jogoId,
  atletas,
  comissao,
  atletaStatusMap,
  comissaoSelecionados,
  capitaoAtletaId,
}: {
  action: (prevState: ConvocacaoFormState, formData: FormData) => Promise<ConvocacaoFormState>;
  jogoId: string;
  atletas: AtletaComFoto[];
  comissao: ComissaoTecnicaRow[];
  atletaStatusMap: Record<string, "titular" | "reserva">;
  comissaoSelecionados: Set<string>;
  capitaoAtletaId: string | null;
}) {
  const [state, formAction] = useFormState(action, initialState);

  const [aba, setAba] = useState<"atletas" | "staff">("atletas");
  const [verLesionados, setVerLesionados] = useState(false);
  // Mapa atletaId -> titular (true) / reserva (false). A ORDEM de inserção das chaves é a ordem de
  // exibição na lista de Convocados — Map preserva ordem de inserção em JS.
  const [convocados, setConvocados] = useState<Map<string, boolean>>(
    () => new Map(Object.entries(atletaStatusMap).map(([id, status]) => [id, status === "titular"])),
  );
  const [comissaoIds, setComissaoIds] = useState<Set<string>>(() => new Set(comissaoSelecionados));
  const [capitaoId, setCapitaoId] = useState(capitaoAtletaId ?? "");

  const atletasPorId = useMemo(() => new Map(atletas.map((a) => [a.id, a])), [atletas]);

  function convocar(atletaId: string) {
    setConvocados((atual) => {
      const proximo = new Map(atual);
      proximo.set(atletaId, false);
      return proximo;
    });
  }

  function removerConvocado(atletaId: string) {
    setConvocados((atual) => {
      const proximo = new Map(atual);
      proximo.delete(atletaId);
      return proximo;
    });
    if (capitaoId === atletaId) setCapitaoId("");
  }

  function alternarTitular(atletaId: string) {
    setConvocados((atual) => {
      const proximo = new Map(atual);
      proximo.set(atletaId, !proximo.get(atletaId));
      return proximo;
    });
  }

  // Disponíveis = não convocados ainda. Departamento Médico fica escondido por padrão (revelado
  // por "Ver Lesionados"); Liberado e Suspenso aparecem direto — suspensão não impede convocar,
  // só o Departamento Médico é tratado como "fora de combate" nesta grade.
  const disponiveis = atletas.filter((a) => !convocados.has(a.id) && a.status !== "departamento_medico");
  const lesionadosDisponiveis = atletas.filter(
    (a) => !convocados.has(a.id) && a.status === "departamento_medico",
  );

  const convocadosList = Array.from(convocados.entries())
    .map(([id, titular]) => ({ atleta: atletasPorId.get(id), titular }))
    .filter((item): item is { atleta: AtletaComFoto; titular: boolean } => Boolean(item.atleta));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jogoId" value={jogoId} />
      {/* Hidden inputs gerados a partir do estado — mantém o mesmo contrato que `saveConvocacao`
          já espera (atleta_<id>=titular|reserva, comissao_<id>), sem precisar mexer em actions.ts. */}
      {convocadosList.map(({ atleta, titular }) => (
        <input
          key={atleta.id}
          type="hidden"
          name={`atleta_${atleta.id}`}
          value={titular ? "titular" : "reserva"}
        />
      ))}
      {Array.from(comissaoIds).map((id) => (
        <input key={id} type="hidden" name={`comissao_${id}`} value="on" />
      ))}

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Convocação salva com sucesso.
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-1 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setAba("atletas")}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            aba === "atletas" ? "border-grena text-grena" : "border-transparent text-neutral-500 hover:text-grena"
          }`}
        >
          Atletas
        </button>
        <button
          type="button"
          onClick={() => setAba("staff")}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            aba === "staff" ? "border-grena text-grena" : "border-transparent text-neutral-500 hover:text-grena"
          }`}
        >
          Diretoria/Staff
        </button>
      </div>

      {aba === "atletas" ? (
        <div className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
              Atletas disponíveis <span className="text-neutral-400">({disponiveis.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {disponiveis.map((a) => (
                <CartaoAtletaDisponivel key={a.id} atleta={a} onClick={() => convocar(a.id)} />
              ))}
              {disponiveis.length === 0 ? (
                <p className="col-span-full py-4 text-center text-sm text-neutral-400">
                  Nenhum atleta disponível pra convocar.
                </p>
              ) : null}
            </div>

            {lesionadosDisponiveis.length > 0 ? (
              <div className="border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  onClick={() => setVerLesionados((v) => !v)}
                  className="text-sm font-medium text-dourado hover:underline"
                >
                  {verLesionados ? "Ocultar lesionados" : `Ver lesionados (${lesionadosDisponiveis.length})`}
                </button>
                {verLesionados ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {lesionadosDisponiveis.map((a) => (
                      <CartaoAtletaDisponivel key={a.id} atleta={a} onClick={() => convocar(a.id)} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
              Convocados <span className="text-neutral-400">({convocadosList.length})</span>
            </h2>
            <div className="space-y-2">
              {convocadosList.map(({ atleta, titular }) => (
                <LinhaConvocado
                  key={atleta.id}
                  atleta={atleta}
                  titular={titular}
                  onToggleTitular={() => alternarTitular(atleta.id)}
                  onRemover={() => removerConvocado(atleta.id)}
                />
              ))}
              {convocadosList.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-400">
                  Nenhum atleta convocado ainda — clique num atleta disponível acima.
                </p>
              ) : null}
            </div>

            <div className="max-w-sm pt-2">
              <label htmlFor="capitaoAtletaId" className="field-label">
                Capitão do jogo
              </label>
              <select
                id="capitaoAtletaId"
                name="capitaoAtletaId"
                value={capitaoId}
                onChange={(e) => setCapitaoId(e.target.value)}
                className="field-input"
              >
                <option value="">Nenhum selecionado</option>
                {convocadosList.map(({ atleta }) => (
                  <option key={atleta.id} value={atleta.id}>
                    {atleta.nome_completo}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">Precisa ser um atleta convocado acima.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
            Comissão Técnica / Diretoria
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {comissao.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={comissaoIds.has(c.id)}
                  onChange={() =>
                    setComissaoIds((atual) => {
                      const proximo = new Set(atual);
                      if (proximo.has(c.id)) proximo.delete(c.id);
                      else proximo.add(c.id);
                      return proximo;
                    })
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                />
                <span>
                  {c.nome_completo} <span className="text-neutral-400">— {c.funcao}</span>
                </span>
              </label>
            ))}
            {comissao.length === 0 ? <p className="text-sm text-neutral-400">Nenhum cadastro encontrado.</p> : null}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <SubmitButton label="Salvar convocados" />
      </div>
    </form>
  );
}
