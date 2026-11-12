"use client";

import Link from "next/link";
import { useState } from "react";
import type { AtletaContratoRow } from "@/lib/supabase/types";
import { ModalShell } from "@/components/programacao/modal";
import { ContratoFormacaoForm } from "@/components/contrato-formacao-form";
import { criarContratoFormacao, atualizarContratoFormacao } from "@/app/atletas/[id]/contrato/formacao/actions";

/** Campos do atleta usados como valores iniciais do formulário dentro do modal — antes vinham só
 * pro resumo do card (`ContratoFormacaoSecao`, agora sem uso), por isso ganhou `emailMae`/`maeCpf`/
 * `emailPai`/`paiCpf`/`dataNascimento` também (precisa de tudo que o formulário usa, já que não há
 * mais uma tela própria carregando o `AtletaRow` inteiro direto do banco). */
export interface ContratoFormacaoAtletaCampos {
  maeNome: string | null;
  maeTelefone: string | null;
  emailMae: string | null;
  maeCpf: string | null;
  paiNome: string | null;
  paiTelefone: string | null;
  emailPai: string | null;
  paiCpf: string | null;
  vigenciaBidInicio: string | null;
  vigenciaBidFim: string | null;
  dataNascimento: string | null;
}

function paraString(valor: string | null): string | undefined {
  return valor ?? undefined;
}

/**
 * Botão "Contrato de Formação" + modal, dentro de `ContratoSecao` — ver docs/superpowers/specs/
 * 2026-11-11-contrato-formacao-fase2-design.md (fase 2, onde esse fluxo nasceu como uma tela
 * própria) e o pedido do Mateus em 12/11/2026 ao ver a tela separada: "essa parte do contrato de
 * formação, pode ficar na parte do contrato de cima. Tipo um botão sabe, ai eu clico e ele abra uma
 * aba por cima (não precisa ser outra aba). Igual acontece quando vamos desativar um atleta" — por
 * isso o mesmo padrão de `AtletaAtivoButton`: `ModalShell` + `useState` `aberto`, e o formulário
 * fecha o próprio modal sozinho quando a action salva com sucesso (`onSuccessClose`, ver
 * `components/contrato-formacao-form.tsx`). A rota antiga (`/atletas/[id]/contrato/formacao`) virou
 * só um redirect — nenhum link do sistema aponta pra lá mais; as actions (`criarContratoFormacao`/
 * `atualizarContratoFormacao`) continuam as mesmas, só sem o `redirect()` no final.
 */
export function ContratoFormacaoButton({
  atletaId,
  atleta,
  contratoFormacao,
}: {
  atletaId: string;
  atleta: ContratoFormacaoAtletaCampos;
  contratoFormacao: AtletaContratoRow | null;
}) {
  const [aberto, setAberto] = useState(false);
  const modoEdicao = contratoFormacao !== null;

  const valoresIniciais: Record<string, string | undefined> = {
    maeNome: paraString(atleta.maeNome),
    maeTelefone: paraString(atleta.maeTelefone),
    emailMae: paraString(atleta.emailMae),
    maeCpf: paraString(atleta.maeCpf),
    paiNome: paraString(atleta.paiNome),
    paiTelefone: paraString(atleta.paiTelefone),
    emailPai: paraString(atleta.emailPai),
    paiCpf: paraString(atleta.paiCpf),
    vigenciaBidInicio: paraString(atleta.vigenciaBidInicio),
    vigenciaBidFim: paraString(atleta.vigenciaBidFim),
    vigenciaInicio: paraString(contratoFormacao?.vigencia_inicio ?? null),
    vigenciaFim: paraString(contratoFormacao?.vigencia_fim ?? null),
    bolsaAprendizagem: contratoFormacao?.bolsa_aprendizagem ? String(contratoFormacao.bolsa_aprendizagem) : undefined,
  };

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        {modoEdicao ? "Contrato de Formação" : "Criar Contrato de Formação"}
      </button>

      {aberto ? (
        <ModalShell titulo="Contrato de Formação" onClose={() => setAberto(false)} maxWidthClassName="max-w-3xl">
          <p className="mb-4 text-sm text-neutral-500">
            {modoEdicao
              ? "Edita o contrato de Formação vigente — as alterações salvam direto neste registro, sem gerar histórico."
              : "Ao salvar, o contrato vigente atual (se existir) é encerrado automaticamente e este passa a ser o vigente, do tipo Formação."}
          </p>
          {modoEdicao ? (
            <div className="mb-4">
              <Link href={`/atletas/${atletaId}/contrato/formacao/pdf`} className="btn-secondary" target="_blank">
                Baixar Contrato de Formação
              </Link>
            </div>
          ) : null}
          <ContratoFormacaoForm
            action={modoEdicao ? atualizarContratoFormacao : criarContratoFormacao}
            atletaId={atletaId}
            valoresIniciais={valoresIniciais}
            modoEdicao={modoEdicao}
            dataNascimentoAtleta={atleta.dataNascimento}
            onSuccessClose={() => setAberto(false)}
          />
        </ModalShell>
      ) : null}
    </>
  );
}
