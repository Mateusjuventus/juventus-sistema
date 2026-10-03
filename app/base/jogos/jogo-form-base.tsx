"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import {
  CATEGORIAS_BASE,
  TODAS_CATEGORIAS_BASE,
  categoriaBaseLabel,
  type CategoriaBase,
} from "@/lib/auth/categorias-base";
import type { JogoBaseFormState } from "./actions";

const initialState: JogoBaseFormState = {};

/** Uma competição cadastrada (ver `app/base/competicoes`), pro `<select>` de Competição abaixo. */
export interface CompeticaoBaseParaSelecao {
  id: string;
  nome: string;
  categoria: CategoriaBase;
}

/**
 * Espelha `app/jogos/jogo-form.tsx`, com um campo a mais (Categoria) — obrigatório, e editável
 * mesmo depois de criado (o jogo pode ter sido lançado na categoria errada). Mesmo padrão de
 * `AtletaBaseForm`/`ComissaoBaseForm`.
 *
 * Diferente do Profissional, o campo Competição aqui é um `<select>` que vem do cadastro de
 * Competições (não texto livre), filtrado ao vivo pela Categoria escolhida — ver doc-comment de
 * `jogoBaseSchema` em `lib/validation/schemas.ts`. Essa é a única filtragem ao vivo por categoria
 * que existe hoje num formulário do sistema (checado antes de implementar — não existia um padrão
 * já pronto pra reaproveitar).
 */
export function JogoBaseForm({
  action,
  entityId,
  defaultValues,
  logoUrl,
  submitLabel,
  categoriasPermitidas,
  competicoes,
}: {
  action: (prevState: JogoBaseFormState, formData: FormData) => Promise<JogoBaseFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  logoUrl?: string | null;
  submitLabel: string;
  /** Categorias que o usuário logado pode usar aqui (ver `getCategoriasBasePermitidas`) — quando
   * omitido, mostra as 7 (compatibilidade com qualquer chamador antigo). */
  categoriasPermitidas?: CategoriaBase[];
  /** Competições cadastradas (já filtradas pelas categorias permitidas) — quando omitido, o select
   * de Competição não oferece nenhuma opção além de "— Nenhuma —". */
  competicoes?: CompeticaoBaseParaSelecao[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  const categoriasDisponiveis = categoriasPermitidas ?? TODAS_CATEGORIAS_BASE;
  const competicoesDisponiveis = competicoes ?? [];

  // Reativo: a lista de competições oferecidas precisa acompanhar a Categoria escolhida ao vivo,
  // mesmo antes de salvar (ex.: criando um jogo do zero, a categoria é escolhida na hora).
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(values.categoria ?? "");
  const competicoesDaCategoria = competicoesDisponiveis.filter((c) => c.categoria === categoriaSelecionada);

  // Jogo antigo (anterior a essa feature) com competição em texto livre que nunca foi vinculada a
  // um cadastro estruturado — mostra o texto pra não parecer que foi perdido.
  const competicaoLegadoSemVinculo =
    !!values.competicao && !values.competicaoId && !competicoesDisponiveis.some((c) => c.nome === values.competicao);

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Categoria e adversário">
        <FieldGroup>
          <SelectField
            label="Categoria"
            name="categoria"
            required
            defaultValue={values.categoria}
            error={errors.categoria}
            onChange={setCategoriaSelecionada}
          >
            <option value="">Selecione</option>
            {CATEGORIAS_BASE.filter((cat) => categoriasDisponiveis.includes(cat.value)).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
          <div>
            <SelectField
              label="Competição"
              name="competicaoId"
              defaultValue={values.competicaoId}
              error={errors.competicaoId}
            >
              <option value="">— Nenhuma —</option>
              {competicoesDaCategoria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectField>
            {categoriaSelecionada && competicoesDaCategoria.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Nenhuma competição cadastrada para {categoriaBaseLabel(categoriaSelecionada as CategoriaBase)} ainda.{" "}
                <Link href="/base/competicoes/nova" className="font-medium text-grena hover:underline">
                  Cadastrar competição
                </Link>
              </p>
            ) : null}
            {competicaoLegadoSemVinculo ? (
              <p className="mt-1 text-xs text-neutral-500">
                Competição cadastrada anteriormente (texto livre): <strong>{values.competicao}</strong>. Não foi
                perdida — selecione acima pra vincular esse jogo ao cadastro estruturado.
              </p>
            ) : null}
          </div>
          <TextField
            label="Rodada/Fase"
            name="rodadaFase"
            defaultValue={values.rodadaFase}
            error={errors.rodadaFase}
          />
          <TextField
            label="Adversário"
            name="adversarioNome"
            required
            defaultValue={values.adversarioNome}
            error={errors.adversarioNome}
          />
          <div className="sm:col-span-2">
            <PhotoField
              label="Logo do adversário"
              name="adversarioLogo"
              currentUrl={logoUrl}
              shape="square"
            />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Data e local">
        <FieldGroup>
          <TextField
            label="Data do jogo"
            name="dataJogo"
            type="date"
            required
            defaultValue={values.dataJogo}
            error={errors.dataJogo}
          />
          <TextField
            label="Horário"
            name="horario"
            type="time"
            defaultValue={values.horario}
            error={errors.horario}
          />
          <TextField
            label="Local/Estádio"
            name="localEstadio"
            defaultValue={values.localEstadio}
            error={errors.localEstadio}
          />
          <TextField
            label="Endereço"
            name="endereco"
            defaultValue={values.endereco}
            error={errors.endereco}
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="mandante"
              name="mandante"
              type="checkbox"
              defaultChecked={values.mandante === "on"}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <label htmlFor="mandante" className="text-sm font-medium text-neutral-700">
              Jogo em casa (mandante)
            </label>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Resultado (preencha depois do jogo)">
        <FieldGroup>
          <TextField
            label="Gols Juventus"
            name="golsPro"
            type="number"
            min={0}
            defaultValue={values.golsPro}
            error={errors.golsPro}
          />
          <TextField
            label="Gols adversário"
            name="golsContra"
            type="number"
            min={0}
            defaultValue={values.golsContra}
            error={errors.golsContra}
          />
        </FieldGroup>
        <p className="text-xs text-neutral-500">
          Deixe em branco até o jogo acontecer. Esses números alimentam o dashboard de resultados.
        </p>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
