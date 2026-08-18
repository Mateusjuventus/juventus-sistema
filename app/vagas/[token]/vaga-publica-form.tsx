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
  /** Nome da função cadastrada — mostrado depois de escolher, pra pessoa conferir que o sistema vai
   * colocá-la na vaga certa antes de confirmar. */
  funcaoNome: string | null;
  /** Se a função dela tem vaga aberta neste jogo. */
  temVaga: boolean;
  vagasRestantes: number;
}

/**
 * Formulário público: a pessoa escolhe o nome, digita os 4 últimos dígitos do CPF e pega a vaga.
 *
 * Ela NÃO escolhe função: a vaga sai do que está no cadastro dela (pedido do Mateus). Por isso a
 * tela mostra, assim que o nome é escolhido, qual vaga vai ser — e avisa antes de tentar quando
 * não há vaga pra aquela função, em vez de deixar a pessoa preencher tudo pra levar um "não" no
 * fim.
 */
export function VagaPublicaForm({
  pessoas,
  pegarAction,
  desistirAction,
  jaInscrito,
}: {
  pessoas: PessoaOpcao[];
  pegarAction: (prevState: VagaPublicaState, formData: FormData) => Promise<VagaPublicaState>;
  desistirAction: (prevState: VagaPublicaState, formData: FormData) => Promise<VagaPublicaState>;
  /** Mapa staffId → situação, pra quem volta ao link ver a própria vaga em vez de tentar de novo. */
  jaInscrito: Record<string, "confirmado" | "espera">;
}) {
  const [state, formAction] = useFormState(pegarAction, {} as VagaPublicaState);
  const [stateDesistir, desistirFormAction] = useFormState(desistirAction, {} as VagaPublicaState);
  const [staffId, setStaffId] = useState("");

  const pessoa = pessoas.find((p) => p.id === staffId);
  const situacaoAtual = staffId ? jaInscrito[staffId] : undefined;
  const resultado = state.sucesso;

  if (resultado) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          ✓
        </div>
        <h2 className="mt-3 text-lg font-bold text-grena-escuro">
          {resultado === "confirmado" ? "Vaga confirmada!" : "Você está na lista de espera"}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {resultado === "confirmado"
            ? "Guarde este link: se precisar desistir, é só voltar aqui."
            : "As vagas da sua função já foram preenchidas. Se alguém desistir, o clube chama você."}
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
          name="staffId"
          form="form-vaga"
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

      {pessoa ? (
        <div
          className={`rounded-md border p-3 text-sm ${
            pessoa.temVaga ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="font-semibold text-neutral-800">Sua função: {pessoa.funcaoNome ?? "não definida"}</p>
          <p className={`mt-0.5 text-xs font-medium ${pessoa.temVaga ? "text-emerald-700" : "text-amber-700"}`}>
            {pessoa.funcaoNome === null
              ? "Seu cadastro está sem função. Fale com o Departamento de Futebol."
              : pessoa.temVaga
                ? `${pessoa.vagasRestantes} vaga${pessoa.vagasRestantes === 1 ? "" : "s"} para ${pessoa.funcaoNome}`
                : `As vagas de ${pessoa.funcaoNome} já foram preenchidas — você entra na lista de espera.`}
          </p>
        </div>
      ) : null}

      {situacaoAtual ? (
        <form action={desistirFormAction} className="space-y-3 rounded-md border border-linha bg-neutral-50 p-3">
          <input type="hidden" name="staffId" value={staffId} />
          <p className="text-sm font-semibold text-grena-escuro">
            {situacaoAtual === "confirmado" ? "Você já tem vaga neste jogo." : "Você já está na lista de espera."}
          </p>
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
        <form id="form-vaga" action={formAction} className="space-y-4">
          <input type="hidden" name="staffId" value={staffId} />
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
            label={pessoa && !pessoa.temVaga ? "Entrar na lista de espera" : "Confirmar minha vaga"}
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
