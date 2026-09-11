"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { FotoAtletaCaptacaoField } from "@/components/foto-atleta-captacao-field";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { InscricaoCaptacaoState, VerificacaoCaptacaoState } from "./actions";

const initialState: InscricaoCaptacaoState = {};
const initialVerificacaoState: VerificacaoCaptacaoState = { verificado: false };

/**
 * Etapa inicial, antes de qualquer campo da ficha (ver spec 2026-09-11-captacao-completar-
 * cadastro-cpf-design.md): CPF + data de nascimento, pra descobrir se já existe um cadastro "Em
 * avaliação" feito pela equipe (formulário interno) esperando ser completado. Achando, o resto do
 * formulário aparece pré-preenchido; não achando (CPF novo, ou não bate com nada elegível), segue
 * como uma inscrição do zero — sem indicar qual desses dois motivos aconteceu.
 */
function VerificacaoCpfStep({
  verificarAction,
  onVerificado,
}: {
  verificarAction: (prevState: VerificacaoCaptacaoState, formData: FormData) => Promise<VerificacaoCaptacaoState>;
  onVerificado: (estado: VerificacaoCaptacaoState) => void;
}) {
  const [estado, formAction] = useFormState(verificarAction, initialVerificacaoState);

  useEffect(() => {
    if (estado.verificado) onVerificado(estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-grena-escuro">Antes de começar</p>
        <p className="mt-1 text-sm text-neutral-500">
          Informe o CPF e a data de nascimento do atleta. Se a equipe já começou um cadastro dele,
          você só vai precisar completar o que falta.
        </p>
      </div>
      <FieldGroup>
        <CpfField label="CPF do atleta" name="cpf" required defaultValue={estado.valuesTexto?.cpf} />
        <TextField
          label="Data de nascimento"
          name="dataNascimento"
          type="date"
          required
          defaultValue={estado.valuesTexto?.dataNascimento}
        />
      </FieldGroup>
      {estado.erro ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p> : null}
      <SubmitButton label="Continuar" pendingLabel="Verificando..." />
    </form>
  );
}

/** Campo de upload de um documento obrigatório (RG, declaração escolar etc.) — sem preview (não é
 * foto), aceita PDF ou imagem porque a maioria das famílias vai fotografar com o celular em vez de
 * escanear (ver spec 2026-09-11, seção 2). */
function DocumentoField({ label, name, error }: { label: string; name: string; error?: string }) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        <span className="text-red-700"> *</span>
      </label>
      <input id={name} name={name} type="file" accept="application/pdf,image/*" className="field-input" />
      <p className="mt-1 text-xs text-neutral-400">Aceita PDF ou foto do documento.</p>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

/**
 * Formulário público de inscrição pro teste/avaliação (ver app/inscricao-captacao-base/actions.ts).
 * Mesmos campos do cadastro interno de Captação, exceto Data de início/término e Status — o Mateus
 * preenche isso na hora de aprovar (aba "Aprovações") ou trocar o status depois. TODOS os campos
 * são obrigatórios (pedido de 19/08) — ver `captacaoInscricaoSchema`.
 *
 * Desde 2026-09-11 (ver spec 2026-09-11-captacao-documentos-termo-auto-cadastro-design.md) também
 * pede foto + 5 documentos obrigatórios e o aceite do Termo de Responsabilidade (consentimento
 * digital, sem assinatura desenhada).
 */
export function InscricaoCaptacaoForm({
  action,
  verificarAction,
}: {
  action: (prevState: InscricaoCaptacaoState, formData: FormData) => Promise<InscricaoCaptacaoState>;
  verificarAction: (prevState: VerificacaoCaptacaoState, formData: FormData) => Promise<VerificacaoCaptacaoState>;
}) {
  const [verificacao, setVerificacao] = useState<VerificacaoCaptacaoState>(initialVerificacaoState);
  const [state, formAction] = useFormState(action, initialState);
  // Prioriza `state.values` (o que a pessoa editou antes de um envio com erro) sobre o
  // pré-preenchimento da verificação — só cai no pré-preenchimento antes da primeira tentativa de
  // envio da ficha completa.
  const values = state.values ?? verificacao.valuesTexto ?? {};
  const errors = state.fieldErrors ?? {};
  const [possuiPlanoSaude, setPossuiPlanoSaude] = useState(values.possuiPlanoSaude === "sim");
  const [federado, setFederado] = useState(values.federado === "sim");
  const formRef = useRef<HTMLFormElement>(null);

  // Mesmo ajuste feito na Ficha de Cadastro de Atleta (bug de 25/08: formulário longo, quem envia
  // costuma estar rolado lá embaixo perto do botão) — rola até o primeiro erro pra pessoa ver na
  // hora o que falta corrigir, em vez de parecer que o envio não fez nada.
  useEffect(() => {
    if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) return;
    const primeiroErro = formRef.current?.querySelector(".field-error");
    primeiroErro?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fieldErrors]);

  // `possuiPlanoSaude`/`federado` são estado local (pra reagir ao <select> em tempo real) — sem
  // isso, o pré-preenchimento vindo da verificação (que só chega depois da montagem inicial do
  // componente) nunca apareceria refletido nos campos condicionais ("Qual plano de saúde"/
  // "Federado por qual clube"), já que `useState` só lê seu valor inicial uma vez.
  useEffect(() => {
    if (!verificacao.valuesTexto) return;
    setPossuiPlanoSaude(verificacao.valuesTexto.possuiPlanoSaude === "sim");
    setFederado(verificacao.valuesTexto.federado === "sim");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificacao]);

  if (!verificacao.verificado) {
    return <VerificacaoCpfStep verificarAction={verificarAction} onVerificado={setVerificacao} />;
  }

  if (state.success) {
    return (
      <div className="py-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-grena-escuro">Inscrição enviada com sucesso!</p>
          <p className="mt-2 text-sm text-neutral-500">
            Obrigado por se inscrever. O Departamento de Futebol de Base vai avaliar e entrar em
            contato pra combinar a avaliação.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-md space-y-5 border-t border-linha pt-6 text-left">
          <div>
            <p className="text-sm font-semibold text-grena-escuro">Uniformização necessária no dia da avaliação</p>
            <p className="mt-1 text-sm text-neutral-600">
              Camiseta branca, short preto, meiões pretos e chuteira apropriada para treino.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-grena-escuro">Leve os documentos originais</p>
            <p className="mt-1 text-sm text-neutral-600">
              Mesmo já tendo enviado cópia digital nesta inscrição, os documentos originais precisam
              ser apresentados fisicamente no dia da avaliação pra liberar a participação do atleta.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-grena-escuro">Próximos passos</p>
            <p className="mt-1 text-sm text-neutral-600">
              O processo de avaliação só começa depois que o clube enviar o agendamento com a data
              de apresentação — a programação semanal com os horários vem depois disso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6" encType="multipart/form-data">
      {verificacao.candidatoId ? (
        <>
          <input type="hidden" name="captacaoIdExistente" value={verificacao.candidatoId} />
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Encontramos um cadastro em andamento com esse CPF — os dados abaixo já vieram
            preenchidos, revise e complete o que faltar.
          </p>
        </>
      ) : (
        <p className="rounded-md bg-cinzaPagina px-3 py-2 text-sm text-neutral-600">
          Não encontramos um cadastro em andamento com esses dados — vamos criar uma inscrição nova.
        </p>
      )}

      <FormSection title="Foto do atleta">
        <FotoAtletaCaptacaoField
          label="Foto (fundo neutro)"
          name="foto"
          required={!verificacao.fotoUrl}
          currentUrl={verificacao.fotoUrl}
          error={errors.foto}
        />
      </FormSection>

      <FormSection title="Dados do atleta">
        <FieldGroup>
          <TextField
            label="Nome completo do atleta"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField label="RG" name="rg" required defaultValue={values.rg} error={errors.rg} />
          <CpfField label="CPF" name="cpf" required defaultValue={values.cpf} error={errors.cpf} />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField
            label="Telefone de contato"
            name="telefone"
            required
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField label="E-mail" name="email" type="email" required defaultValue={values.email} error={errors.email} />
        </FieldGroup>
      </FormSection>

      <FormSection title="Dados esportivos">
        <FieldGroup>
          <SelectField label="Categoria" name="categoria" required defaultValue={values.categoria} error={errors.categoria}>
            <option value="">Selecione</option>
            {CATEGORIAS_BASE.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Posição"
            name="posicao"
            required
            defaultValue={values.posicao}
            error={errors.posicao}
            placeholder="Ex: Zagueiro, Atacante"
          />
          <TextField
            label="2ª posição"
            name="segundaPosicao"
            defaultValue={values.segundaPosicao}
            error={errors.segundaPosicao}
            placeholder="Se o atleta não tiver, deixe em branco"
          />
          <SelectField
            label="Pé dominante"
            name="peDominante"
            required
            defaultValue={values.peDominante}
            error={errors.peDominante}
          >
            <option value="">Selecione</option>
            <option value="destro">Destro</option>
            <option value="canhoto">Canhoto</option>
            <option value="ambidestro">Ambidestro</option>
          </SelectField>
          <TextField
            label="Altura (metros)"
            name="altura"
            type="number"
            step="0.01"
            required
            defaultValue={values.altura}
            error={errors.altura}
            placeholder="Ex: 1.75"
          />
          <TextField
            label="Peso (kg)"
            name="peso"
            type="number"
            step="0.1"
            required
            defaultValue={values.peso}
            error={errors.peso}
            placeholder="Ex: 68.5"
          />
          <TextField
            label="Indicação"
            name="indicacao"
            required
            defaultValue={values.indicacao}
            error={errors.indicacao}
            placeholder="Quem indicou o candidato"
          />
          <TextField
            label="Clube anterior"
            name="clubeAnterior"
            required
            defaultValue={values.clubeAnterior}
            error={errors.clubeAnterior}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Escolaridade e saúde">
        <FieldGroup>
          <TextField label="Escola" name="escola" required defaultValue={values.escola} error={errors.escola} />
          <TextField
            label="Escolaridade"
            name="escolaridade"
            required
            defaultValue={values.escolaridade}
            error={errors.escolaridade}
            placeholder="Ex: 6º ano"
          />
          <SelectField
            label="Período escolar"
            name="periodoEscolar"
            required
            defaultValue={values.periodoEscolar}
            error={errors.periodoEscolar}
          >
            <option value="">Selecione</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
          </SelectField>
          <div />
          <SelectField
            label="Possui plano de saúde?"
            name="possuiPlanoSaude"
            required
            defaultValue={values.possuiPlanoSaude}
            error={errors.possuiPlanoSaude}
            onChange={(value) => setPossuiPlanoSaude(value === "sim")}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </SelectField>
          {possuiPlanoSaude ? (
            <TextField
              label="Qual plano de saúde"
              name="planoSaudeQual"
              required
              defaultValue={values.planoSaudeQual}
              error={errors.planoSaudeQual}
            />
          ) : null}
          <SelectField
            label="É federado?"
            name="federado"
            required
            defaultValue={values.federado}
            error={errors.federado}
            onChange={(value) => setFederado(value === "sim")}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </SelectField>
          {federado ? (
            <TextField
              label="Federado por qual clube"
              name="federadoClube"
              required
              defaultValue={values.federadoClube}
              error={errors.federadoClube}
            />
          ) : null}
        </FieldGroup>
      </FormSection>

      <FormSection title="Responsáveis">
        <FieldGroup>
          <TextField
            label="Nome da mãe"
            name="maeNome"
            required
            defaultValue={values.maeNome}
            error={errors.maeNome}
          />
          <TextField
            label="Telefone da mãe"
            name="maeTelefone"
            required
            defaultValue={values.maeTelefone}
            error={errors.maeTelefone}
          />
          <TextField
            label="Nome do pai"
            name="paiNome"
            required
            defaultValue={values.paiNome}
            error={errors.paiNome}
          />
          <TextField
            label="Telefone do pai"
            name="paiTelefone"
            required
            defaultValue={values.paiTelefone}
            error={errors.paiTelefone}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Endereço">
        <EnderecoFields
          required
          defaultValues={{
            cep: values.cep,
            logradouro: values.logradouro,
            numero: values.numero,
            complemento: values.complemento,
            bairro: values.bairro,
            cidade: values.cidade,
            uf: values.uf,
          }}
          errors={{
            cep: errors.cep,
            logradouro: errors.logradouro,
            numero: errors.numero,
            complemento: errors.complemento,
            bairro: errors.bairro,
            cidade: errors.cidade,
            uf: errors.uf,
          }}
        />
      </FormSection>

      <FormSection title="Documentos obrigatórios">
        <p className="text-sm text-neutral-500">
          Todos os itens abaixo são obrigatórios pra enviar a inscrição.
        </p>
        <FieldGroup>
          <DocumentoField label="Cópia do RG do atleta" name="rg_atleta" error={errors.rg_atleta} />
          <DocumentoField
            label="Cópia do RG do(s) responsável(is)"
            name="rg_responsavel"
            error={errors.rg_responsavel}
          />
          <DocumentoField label="Declaração escolar" name="declaracao_escolar" error={errors.declaracao_escolar} />
          <DocumentoField label="Atestado médico" name="atestado_medico" error={errors.atestado_medico} />
          <DocumentoField
            label="Eletrocardiograma com laudo"
            name="eletrocardiograma"
            error={errors.eletrocardiograma}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Termo de Responsabilidade">
        <div className="space-y-3 rounded-md bg-cinzaPagina p-4 text-sm text-neutral-700">
          <p>
            Este documento estabelece as normas a serem cumpridas para a participação do Atleta no
            processo de avaliação, realizado gratuitamente pelo JUVENTUS SOCIEDADE ANONIMA DO
            FUTEBOL.
          </p>
          <p>
            <strong>1º</strong> — O RESPONSÁVEL e/ou ATLETA declaram ter pleno conhecimento de que a
            avaliação envolve testes físicos, treinos com bola, coletivos e qualquer outro tipo de
            trabalho técnico proposto pela comissão técnica.
          </p>
          <p>
            <strong>2º</strong> — O RESPONSÁVEL declara que se responsabiliza pela autenticidade dos
            documentos apresentados, civil e criminalmente na eventualidade do mesmo conter qualquer
            irregularidade.
          </p>
          <p>
            <strong>3º</strong> — O RESPONSÁVEL declara estar ciente de que, como em qualquer
            atividade física, podem ocorrer ferimentos no ATLETA durante o período de avaliação,
            dessa forma, ambos isentam o clube de toda e qualquer responsabilidade por eventuais
            lesões físicas, fraturas, acidentes em geral ou qualquer dano que venha ocorrer durante o
            período de avaliação.
          </p>
          <p>
            <strong>4º</strong> — O RESPONSÁVEL e/ou ATLETA declaram estar ciente que o JUVENTUS
            SOCIEDADE ANONIMA DO FUTEBOL não assume qualquer compromisso de aprovação ou contratação,
            além de não resolver problemas de extravio de documentos, materiais e utensílios
            particulares do Atleta.
          </p>
          <p>
            <strong>5º</strong> — O RESPONSÁVEL declara, ainda que, tenha ciência que o clube não
            fornecerá Declaração Escolar para justificativa de faltas, caso o horário das avaliações
            coincida com o horário escolar.
          </p>
          <p>
            E por estar de acordo com todos os itens acima estabelecidos, o RESPONSÁVEL LEGAL
            autoriza a participação do ATLETA no processo de seleção do JUVENTUS SOCIEDADE ANONIMA DO
            FUTEBOL.
          </p>
        </div>

        <FieldGroup>
          <TextField
            label="Nome completo do responsável legal"
            name="responsavelLegalNome"
            required
            defaultValue={values.responsavelLegalNome}
            error={errors.responsavelLegalNome}
          />
          <CpfField
            label="CPF do responsável legal"
            name="responsavelLegalCpf"
            required
            defaultValue={values.responsavelLegalCpf}
            error={errors.responsavelLegalCpf}
          />
        </FieldGroup>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <input
              id="concordoAtleta"
              name="concordoAtleta"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <label htmlFor="concordoAtleta" className="text-sm font-medium text-neutral-700">
              O Atleta declara ter lido e concorda com os termos acima.
            </label>
          </div>
          {errors.concordoAtleta ? <p className="field-error">{errors.concordoAtleta}</p> : null}

          <div className="flex items-start gap-2">
            <input
              id="concordoResponsavel"
              name="concordoResponsavel"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <label htmlFor="concordoResponsavel" className="text-sm font-medium text-neutral-700">
              O Responsável Legal declara ter lido e concorda com os termos acima.
            </label>
          </div>
          {errors.concordoResponsavel ? <p className="field-error">{errors.concordoResponsavel}</p> : null}
        </div>
      </FormSection>

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <SubmitButton label="Enviar inscrição" pendingLabel="Enviando..." />
    </form>
  );
}
