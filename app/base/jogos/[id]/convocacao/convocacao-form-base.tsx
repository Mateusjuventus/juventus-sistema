"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import { categoriaDaPosicao, corCategoriaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import { nomeExibido, ordenarPorNomeExibido } from "@/lib/futebol/nome-atleta";
import type { ConvocacaoFormState } from "@/lib/jogos-base/convocacao-actions";

const initialState: ConvocacaoFormState = {};

// Limites de uma convocação de jogo — 11 titulares (formação completa) e 12 reservas no banco.
const TITULARES_MAX = 11;
const RESERVAS_MAX = 12;

type AtletaComFoto = AtletaBaseRow & { fotoUrl: string | null };

/** Avatar do atleta na grade de Convocação — foto real quando cadastrada, senão o avatar colorido
 * de iniciais (ver `components/atleta-avatar.tsx`), mesmo usado em "Meus Atletas" e nos candidatos
 * da Captação, pra manter a mesma "cara" em qualquer lista de atleta do sistema. */
function Avatar({ atleta, className = "h-10 w-10" }: { atleta: AtletaComFoto; className?: string }) {
  return <AtletaAvatarCirculo nome={nomeExibido(atleta)} fotoUrl={atleta.fotoUrl} className={className} />;
}

function TagPosicao({ atleta }: { atleta: AtletaComFoto }) {
  const categoria = categoriaDaPosicao(atleta.posicao);
  return (
    <span
      className={`inline-flex w-11 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${corCategoriaPosicao(categoria)}`}
    >
      {siglaCategoriaPosicao(categoria)}
    </span>
  );
}

/**
 * Cartão de um atleta na grade de "Atletas Disponíveis" — os dois botões já mandam o atleta direto
 * pra lista escolhida (Titular ou Reserva), sem passo intermediário. Cada botão fica desabilitado
 * quando aquela lista já está no limite.
 */
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

/** Linha de um atleta já convocado (titular ou reserva) — X remove e devolve pra Disponíveis.
 * O número da camisa aqui é o DESSA convocação (jogo), não o do cadastro do atleta — na Base a
 * numeração não é fixa, muda de jogo pra jogo, então vem sempre em branco até alguém preencher
 * (botão pequeno de editar/salvar, sem sair da tela — só confirma no estado local; a gravação de
 * verdade acontece junto com o resto da convocação, no "Salvar convocados" do formulário). */
function LinhaConvocado({
  atleta,
  numero,
  onChangeNumero,
  onRemover,
}: {
  atleta: AtletaComFoto;
  numero: string;
  onChangeNumero: (valor: string) => void;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valorEditado, setValorEditado] = useState(numero);

  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2">
      <Avatar atleta={atleta} className="h-8 w-8" />
      <TagPosicao atleta={atleta} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
        {nomeExibido(atleta)}
      </span>

      {editando ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={0}
            max={99}
            autoFocus
            value={valorEditado}
            onChange={(e) => setValorEditado(e.target.value)}
            placeholder="Nº"
            className="field-input w-14 px-1.5 py-0.5 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              onChangeNumero(valorEditado);
              setEditando(false);
            }}
            className="shrink-0 rounded-md bg-grena px-1.5 py-1 text-[11px] font-medium text-white hover:bg-grena-escuro"
          >
            Salvar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setValorEditado(numero);
            setEditando(true);
          }}
          title="Editar número da camisa nessa convocação"
          className="shrink-0 rounded-md border border-neutral-200 px-1.5 py-1 text-[11px] font-medium text-neutral-500 hover:border-grena hover:text-grena"
        >
          {numero ? `Nº ${numero} · Editar` : "Sem número · Editar"}
        </button>
      )}

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

/** Espelha `app/jogos/[id]/convocacao/convocacao-form.tsx` para o Futebol de Base. */
export function ConvocacaoFormBase({
  action,
  jogoId,
  atletas,
  comissao,
  atletaStatusMap,
  atletaNumeroCamisaMap,
  comissaoSelecionados,
  capitaoAtletaId,
}: {
  action: (prevState: ConvocacaoFormState, formData: FormData) => Promise<ConvocacaoFormState>;
  jogoId: string;
  atletas: AtletaComFoto[];
  comissao: ComissaoTecnicaBaseRow[];
  atletaStatusMap: Record<string, "titular" | "reserva">;
  atletaNumeroCamisaMap: Record<string, number | null>;
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
  // Número da camisa NESSA convocação (não o do cadastro do atleta — ver comentário em
  // `LinhaConvocado`). Só entra no map quando tem valor; um atleta recém-escalado começa sem
  // entrada aqui, e a linha mostra "Sem número" até alguém editar e salvar.
  const [numerosCamisa, setNumerosCamisa] = useState<Map<string, string>>(
    () =>
      new Map(
        Object.entries(atletaNumeroCamisaMap)
          .filter((entry): entry is [string, number] => entry[1] != null)
          .map(([id, numero]) => [id, String(numero)]),
      ),
  );
  const [comissaoIds, setComissaoIds] = useState<Set<string>>(() => new Set(comissaoSelecionados));
  const [capitaoId, setCapitaoId] = useState(capitaoAtletaId ?? "");

  function alterarNumeroCamisa(atletaId: string, valor: string) {
    setNumerosCamisa((atual) => {
      const proximo = new Map(atual);
      if (valor.trim()) proximo.set(atletaId, valor.trim());
      else proximo.delete(atletaId);
      return proximo;
    });
  }

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
    setNumerosCamisa((atual) => {
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
      {/* Hidden inputs gerados a partir do estado — mantém o mesmo contrato que `saveConvocacaoBase`
          já espera (atleta_<id>=titular|reserva, comissao_<id>), sem precisar mexer em actions.ts. */}
      {titularesList.map((a) => (
        <input key={a.id} type="hidden" name={`atleta_${a.id}`} value="titular" />
      ))}
      {reservasList.map((a) => (
        <input key={a.id} type="hidden" name={`atleta_${a.id}`} value="reserva" />
      ))}
      {[...titularesList, ...reservasList].map((a) => (
        <input key={`camisa_${a.id}`} type="hidden" name={`camisa_${a.id}`} value={numerosCamisa.get(a.id) ?? ""} />
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
                  <LinhaConvocado
                    key={a.id}
                    atleta={a}
                    numero={numerosCamisa.get(a.id) ?? ""}
                    onChangeNumero={(valor) => alterarNumeroCamisa(a.id, valor)}
                    onRemover={() => removerConvocado(a.id)}
                  />
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
                  <LinhaConvocado
                    key={a.id}
                    atleta={a}
                    numero={numerosCamisa.get(a.id) ?? ""}
                    onChangeNumero={(valor) => alterarNumeroCamisa(a.id, valor)}
                    onRemover={() => removerConvocado(a.id)}
                  />
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
