"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { VagaPublicaState } from "./actions";

function Botao({ label, pendente, classe }: { label: string; pendente: string; classe: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${classe} w-full`} disabled={pending}>
      {pending ? pendente : label}
    </button>
  );
}

export interface PessoaOpcao {
  id: string;
  nome: string;
  /** Nome da função cadastrada. É ela que define QUAL vaga é dessa pessoa — ninguém escolhe função
   * aqui (ver a spec). */
  funcaoNome: string | null;
  temVaga: boolean;
  vagasRestantes: number;
  /** Horário da função dela, já resolvido (o da função, ou o geral do jogo). */
  horario: string | null;
}

export interface InscricaoDaPessoa {
  situacao: "confirmado" | "espera";
  funcaoNome: string;
  horario: string | null;
}

/** Cartão com o que a pessoa precisa saber pra chegar no jogo: função, horário e local. É o mesmo
 * bloco na confirmação e em quem volta ao link depois — o horário é a informação que ela vem
 * procurar de novo. */
function CartaoVaga({
  funcaoNome,
  horario,
  local,
}: {
  funcaoNome: string;
  horario: string | null;
  local: string | null;
}) {
  return (
    <div className="mt-3 rounded-md border border-linha p-3 text-left text-sm text-neutral-700">
      <p>
        <span className="font-semibold">Sua função:</span> {funcaoNome}
      </p>
      {horario ? (
        <p className="mt-1">
          <span className="font-semibold">Apresentar-se às:</span> {horario}
        </p>
      ) : null}
      {local ? (
        <p className="mt-1">
          <span className="font-semibold">Local:</span> {local}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Formulário público. A pessoa escolhe o nome, e só então a tela mostra **a vaga dela** — não a
 * lista de todas as funções abertas (pedido do Mateus). Duas razões: o gandula não precisa saber
 * quantos seguranças faltam, e o horário de apresentação muda por função — mostrar o do jogo pra
 * todo mundo faria metade do grupo chegar na hora errada.
 *
 * Ela não escolhe função em momento nenhum: a vaga sai do que está no cadastro dela.
 */
export function VagaPublicaForm({
  pessoas,
  pegarAction,
  desistirAction,
  inscricaoPorStaff,
  localApresentacao,
}: {
  pessoas: PessoaOpcao[];
  pegarAction: (prevState: VagaPublicaState, formData: FormData) => Promise<VagaPublicaState>;
  desistirAction: (prevState: VagaPublicaState, formData: FormData) => Promise<VagaPublicaState>;
  /** Quem já está na lista, com a função e o horário — pra quem volta ao link ver a própria vaga. */
  inscricaoPorStaff: Record<string, InscricaoDaPessoa>;
  localApresentacao: string | null;
}) {
  const [state, formAction] = useFormState(pegarAction, {} as VagaPublicaState);
  const [stateDesistir, desistirFormAction] = useFormState(desistirAction, {} as VagaPublicaState);
  const [staffId, setStaffId] = useState("");

  const pessoa = pessoas.find((p) => p.id === staffId);
  const inscricao = staffId ? inscricaoPorStaff[staffId] : undefined;

  if (state.sucesso) {
    const confirmado = state.sucesso === "confirmado";
    return (
      <div className="text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white ${
            confirmado ? "bg-emerald-600" : "bg-indigo-600"
          }`}
        >
          {confirmado ? "✓" : "•"}
        </div>
        <h2 className="mt-3 text-lg font-bold text-grena-escuro">
          {confirmado ? "Vaga confirmada!" : "Você está na lista de espera"}
        </h2>
        {confirmado && state.funcaoNome ? (
          <CartaoVaga funcaoNome={state.funcaoNome} horario={state.horario ?? null} local={localApresentacao} />
        ) : (
          <p className="mt-2 text-sm text-neutral-600">
            As vagas da sua função já foram preenchidas. Se alguém desistir, o clube chama você.
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          Guarde este link: dá para conferir o horário ou desistir voltando aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="staffId" className="field-label">
          Quem é você?
        </label>
        <select
          id="staffId"
          className="field-input"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        >
          <option value="">— selecione seu nome —</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-neutral-500">
          Não está na lista?{" "}
          <Link href="/cadastro-staff" className="font-semibold text-grena underline">
            Faça seu cadastro primeiro
          </Link>{" "}
          e volte a este link.
        </p>
      </div>

      {inscricao ? (
        <form action={desistirFormAction} className="space-y-3 rounded-md border border-linha bg-neutral-50 p-3">
          <input type="hidden" name="staffId" value={staffId} />
          <p className="text-sm font-semibold text-grena-escuro">
            {inscricao.situacao === "confirmado"
              ? "Você já tem vaga neste jogo."
              : "Você está na lista de espera deste jogo."}
          </p>
          {inscricao.situacao === "confirmado" ? (
            <CartaoVaga
              funcaoNome={inscricao.funcaoNome}
              horario={inscricao.horario}
              local={localApresentacao}
            />
          ) : null}
          <div>
            <label htmlFor="finalCpfDesistir" className="field-label">
              4 últimos dígitos do seu CPF
            </label>
            <input
              id="finalCpfDesistir"
              name="finalCpf"
              inputMode="numeric"
              maxLength={4}
              className="field-input"
              placeholder="0000"
            />
          </div>
          {stateDesistir.error ? <p className="field-error">{stateDesistir.error}</p> : null}
          <Botao label="Desistir da vaga" pendente="Liberando..." classe="btn-secondary" />
          <p className="text-center text-xs text-neutral-500">
            Se desistir, a vaga volta para o grupo automaticamente.
          </p>
        </form>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="staffId" value={staffId} />

          {pessoa ? (
            pessoa.funcaoNome === null ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-neutral-800">Seu cadastro está sem função</p>
                <p className="mt-0.5 text-xs font-medium text-amber-700">
                  Fale com o Departamento de Futebol para ajustar antes de pegar vaga.
                </p>
              </div>
            ) : (
              <div
                className={`rounded-md border p-3 text-sm ${
                  pessoa.temVaga ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="font-semibold text-neutral-800">Sua vaga: {pessoa.funcaoNome}</p>
                <p
                  className={`mt-0.5 text-xs font-medium ${
                    pessoa.temVaga ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {pessoa.temVaga
                    ? `${pessoa.vagasRestantes} vaga${pessoa.vagasRestantes === 1 ? "" : "s"} restante${
                        pessoa.vagasRestantes === 1 ? "" : "s"
                      }`
                    : `As vagas de ${pessoa.funcaoNome} já foram preenchidas — você entra na lista de espera.`}
                </p>
                {/* O horário só aparece DEPOIS de confirmar: antes disso é informação de quem vai
                    trabalhar, e mostrar aqui faria alguém anotar o horário sem pegar a vaga. */}
              </div>
            )
          ) : null}

          <div>
            <label htmlFor="finalCpf" className="field-label">
              4 últimos dígitos do seu CPF
            </label>
            <input
              id="finalCpf"
              name="finalCpf"
              inputMode="numeric"
              maxLength={4}
              className="field-input"
              placeholder="0000"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Serve só para confirmar que é você. Nenhum dado seu aparece aqui.
            </p>
          </div>

          {state.error ? <p className="field-error">{state.error}</p> : null}

          <Botao
            label={pessoa && !pessoa.temVaga && pessoa.funcaoNome ? "Entrar na lista de espera" : "Confirmar minha vaga"}
            pendente="Registrando..."
            classe="btn-primary"
          />
          <p className="text-center text-xs text-neutral-500">
            Por ordem de chegada. A vaga só é sua depois de confirmar.
          </p>
        </form>
      )}
    </div>
  );
}
