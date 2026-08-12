"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { corCategoriaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import type { AtletaRow, ComissaoTecnicaRow } from "@/lib/supabase/types";
import type { ConvocacaoFormState } from "./actions";

const initialState: ConvocacaoFormState = {};

// Limites de uma convocação de jogo — 11 titulares (formação completa) e 12 reservas no banco.
const TITULARES_MAX = 11;
const RESERVAS_MAX = 12;

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
 * Cartão de um atleta na grade de "Atletas Disponíveis" — os dois botões já mandam o atleta direto
 * pra lista escolhida (Titular ou Reserva), sem passo intermediário. Cada botão fica desabilitado
 * quando aquela lista já está no limite.
 */
/** Nome que aparece no cartão (apelido, quando existe) — a lista chega do banco ordenada por
 * `nome_completo`, então ordenar por ele deixava a grade fora de ordem aos olhos de quem lê
 * ("Justen" caindo depois de "Keven", por exemplo). Ordenar pelo texto exibido resolve. */
function nomeExibido(atleta: { apelido: string | null; nome_completo: string }): string {
  return atleta.apelido || atleta.nome_completo;
}

function ordenarPorNomeExibido<T extends { apelido: string | null; nome_completo: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => nomeExibido(a).localeCompare(nomeExibido(b), "pt-BR"));
}

function CartaoAtletaDisponivel({
  atleta,
  titularCheio,
  reservaCheia,
  onAddTitular,
  onAddReserva,
}: {
  atleta: AtletaComFoto;
  titularCheio: boolean;
  reservaCheia: boolean;
  onAddTitular: () => void;
  onAddReserva: () => void;
}) {
  return (
    <div className="card flex items-center gap-1.5 p-2">
      <Avatar atleta={atleta} className="h-8 w-8" />
      <TagPosicao atleta={atleta} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
        {nomeExibido(atleta)}
      </span>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onAddTitular}
          disabled={titularCheio}
          title={titularCheio ? `Titular completo (${TITULARES_MAX}/${TITULARES_MAX})` : undefined}
          className="rounded-md bg-grena px-1.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-grena-escuro disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          Titular
        </button>
        <button
          type="button"
          onClick={onAddReserva}
          disabled={reservaCheia}
          title={reservaCheia ? `Reservas completo (${RESERVAS_MAX}/${RESERVAS_MAX})` : undefined}
          className="rounded-md border border-neutral-300 px-1.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
        >
          Reserva
        </button>
      </div>
    </div>
  );
}

/** Linha de um atleta já convocado (titular ou reserva) — X remove e devolve pra Disponíveis. */
function LinhaConvocado({ atleta, onRemover }: { atleta: AtletaComFoto; onRemover: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2">
      <Avatar atleta={atleta} className="h-8 w-8" />
      <TagPosicao atleta={atleta} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
        {nomeExibido(atleta)}
      </span>
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
  // exibição nas listas — Map preserva ordem de inserção em JS.
  const [convocados, setConvocados] = useState<Map<string, boolean>>(
    () => new Map(Object.entries(atletaStatusMap).map(([id, status]) => [id, status === "titular"])),
  );
  const [comissaoIds, setComissaoIds] = useState<Set<string>>(() => new Set(comissaoSelecionados));
  const [capitaoId, setCapitaoId] = useState(capitaoAtletaId ?? "");

  const atletasPorId = useMemo(() => new Map(atletas.map((a) => [a.id, a])), [atletas]);

  const titularesList = Array.from(convocados.entries())
    .filter(([, titular]) => titular)
    .map(([id]) => atletasPorId.get(id))
    .filter((a): a is AtletaComFoto => Boolean(a));
  const reservasList = Array.from(convocados.entries())
    .filter(([, titular]) => !titular)
    .map(([id]) => atletasPorId.get(id))
    .filter((a): a is AtletaComFoto => Boolean(a));

  const titularCheio = titularesList.length >= TITULARES_MAX;
  const reservaCheia = reservasList.length >= RESERVAS_MAX;

  function adicionar(atletaId: string, titular: boolean) {
    if (titular && titularCheio) return;
    if (!titular && reservaCheia) return;
    setConvocados((atual) => new Map(atual).set(atletaId, titular));
  }

  function removerConvocado(atletaId: string) {
    setConvocados((atual) => {
      const proximo = new Map(atual);
      proximo.delete(atletaId);
      return proximo;
    });
    if (capitaoId === atletaId) setCapitaoId("");
  }

  // Disponíveis = não convocados ainda. Departamento Médico fica escondido por padrão (revelado
  // por "Ver Lesionados"); Liberado e Suspenso aparecem direto — suspensão não impede convocar,
  // só o Departamento Médico é tratado como "fora de combate" nesta grade.
  const disponiveis = ordenarPorNomeExibido(
    atletas.filter((a) => !convocados.has(a.id) && a.status !== "departamento_medico"),
  );
  const lesionadosDisponiveis = ordenarPorNomeExibido(
    atletas.filter((a) => !convocados.has(a.id) && a.status === "departamento_medico"),
  );

  const convocadosCandidatosCapitao = [...titularesList, ...reservasList];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jogoId" value={jogoId} />
      {/* Hidden inputs gerados a partir do estado — mantém o mesmo contrato que `saveConvocacao`
          já espera (atleta_<id>=titular|reserva, comissao_<id>), sem precisar mexer em actions.ts. */}
      {titularesList.map((a) => (
        <input key={a.id} type="hidden" name={`atleta_${a.id}`} value="titular" />
      ))}
      {reservasList.map((a) => (
        <input key={a.id} type="hidden" name={`atleta_${a.id}`} value="reserva" />
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
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {disponiveis.map((a) => (
                <CartaoAtletaDisponivel
                  key={a.id}
                  atleta={a}
                  titularCheio={titularCheio}
                  reservaCheia={reservaCheia}
                  onAddTitular={() => adicionar(a.id, true)}
                  onAddReserva={() => adicionar(a.id, false)}
                />
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
                  <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {lesionadosDisponiveis.map((a) => (
                      <CartaoAtletaDisponivel
                        key={a.id}
                        atleta={a}
                        titularCheio={titularCheio}
                        reservaCheia={reservaCheia}
                        onAddTitular={() => adicionar(a.id, true)}
                        onAddReserva={() => adicionar(a.id, false)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card space-y-2 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
                Titular{" "}
                <span className={titularCheio ? "text-dourado" : "text-neutral-400"}>
                  ({titularesList.length}/{TITULARES_MAX})
                </span>
              </h2>
              <div className="space-y-2">
                {titularesList.map((a) => (
                  <LinhaConvocado key={a.id} atleta={a} onRemover={() => removerConvocado(a.id)} />
                ))}
                {titularesList.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400">
                    Nenhum titular selecionado ainda.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="card space-y-2 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
                Reservas{" "}
                <span className={reservaCheia ? "text-dourado" : "text-neutral-400"}>
                  ({reservasList.length}/{RESERVAS_MAX})
                </span>
              </h2>
              <div className="space-y-2">
                {reservasList.map((a) => (
                  <LinhaConvocado key={a.id} atleta={a} onRemover={() => removerConvocado(a.id)} />
                ))}
                {reservasList.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400">
                    Nenhuma reserva selecionada ainda.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card max-w-sm space-y-1 p-5">
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
              {convocadosCandidatosCapitao.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome_completo}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">Precisa ser um atleta convocado (titular ou reserva).</p>
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
