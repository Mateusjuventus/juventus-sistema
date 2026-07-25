"use client";

import { useState } from "react";
import { TextField, TextAreaField } from "@/components/fields";

export interface PessoaSelecionavel {
  id: string;
  nome: string;
  extra: string;
}

/** Um jogo já cadastrado, pra preencher rapidamente as informações de jogo do relatório sem
 * digitar tudo de novo — ver `JogoOpcao` em `app/relatorios/avulso/page.tsx`. */
export interface JogoOpcao {
  id: string;
  label: string;
  adversario: string;
  competicao: string;
  data: string;
  horario: string;
  local: string;
}

/** Uma lista com checkbox por pessoa, com um campo de busca simples (filtra por nome) — usada nas
 * três seções (Atletas, Comissão Técnica, Staff) do relatório avulso. */
function ListaSelecao({ titulo, name, pessoas }: { titulo: string; name: string; pessoas: PessoaSelecionavel[] }) {
  const [busca, setBusca] = useState("");
  const filtradas = busca.trim()
    ? pessoas.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : pessoas;

  return (
    <div className="card space-y-2 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">{titulo}</h3>
      {pessoas.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhum cadastro encontrado.</p>
      ) : (
        <>
          <input
            type="text"
            placeholder={`Buscar em ${titulo.toLowerCase()}...`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="field-input"
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-100">
            {filtradas.length === 0 ? (
              <p className="p-3 text-sm text-neutral-400">Nada encontrado.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filtradas.map((p) => (
                  <li key={p.id} className="px-3 py-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={`${name}_${p.id}`}
                        className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                      />
                      <span className="text-neutral-800">
                        {p.nome} <span className="text-neutral-400">— {p.extra}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface OpcaoColuna {
  name: string;
  label: string;
}

/** Um grupo de checkboxes de coluna, com um título pequeno acima — separa "Dados gerais" de
 * campos que só existem pra Atletas ou só pra Comissão Técnica. */
function GrupoColunas({
  titulo,
  colunas,
  marcadasPorPadrao,
}: {
  titulo: string;
  colunas: OpcaoColuna[];
  marcadasPorPadrao: Set<string>;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {colunas.map((coluna) => (
          <label key={coluna.name} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={coluna.name}
              defaultChecked={marcadasPorPadrao.has(coluna.name)}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <span className="text-neutral-700">{coluna.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Por padrão só os campos que já existiam antes (Nascimento/CPF/RG/Telefone/Posição/Função) vêm
 * marcados — todo o resto (o "todos os dados do cadastro") fica disponível, mas o usuário escolhe
 * o que realmente quer no documento. */
const COLUNAS_MARCADAS_POR_PADRAO = new Set([
  "colNascimento",
  "colCpf",
  "colRg",
  "colTelefone",
  "colPosicao",
  "colFuncao",
]);

const COLUNAS_GERAIS: OpcaoColuna[] = [
  { name: "colApelido", label: "Apelido" },
  { name: "colNascimento", label: "Data de nascimento" },
  { name: "colCpf", label: "CPF" },
  { name: "colRg", label: "RG" },
  { name: "colTelefone", label: "Telefone" },
  { name: "colEmail", label: "E-mail" },
  { name: "colEndereco", label: "Endereço" },
  { name: "colFuncao", label: "Função" },
];

const COLUNAS_ATLETAS: OpcaoColuna[] = [
  { name: "colPosicao", label: "Posição" },
  { name: "colNumeroCamisa", label: "Nº da camisa" },
  { name: "colNumeroRegistro", label: "Nº CBF/FPF" },
  { name: "colPeDominante", label: "Pé dominante" },
  { name: "colNaturalidade", label: "Naturalidade" },
  { name: "colDataInicioClube", label: "Início no clube" },
  { name: "colTipoContrato", label: "Tipo de contrato" },
  { name: "colDataFimContrato", label: "Fim de contrato" },
  { name: "colContratoFormacao", label: "Contrato de formação" },
  { name: "colEmpresarioNome", label: "Empresário" },
  { name: "colStatus", label: "Situação" },
];

const COLUNAS_COMISSAO: OpcaoColuna[] = [{ name: "colTipoQuartoPreferido", label: "Quarto preferido" }];

/**
 * Formulário do relatório/lista avulsa: monta um PDF sob medida (título, descrição, informações de
 * jogo opcionais — digitadas ou preenchidas a partir de um jogo já cadastrado —, quem entra e
 * quais colunas aparecem) sem depender de nenhum jogo já convocado. Envio é um POST simples de
 * formulário (sem Server Action) — abre o PDF numa aba nova, igual a qualquer link "Gerar PDF" do
 * sistema, só que apontando pra uma rota que lê os dados do corpo do POST em vez de um `id` de jogo
 * na URL.
 */
export function RelatorioAvulsoForm({
  actionUrl,
  jogosCadastrados,
  atletas,
  comissao,
  staff,
}: {
  actionUrl: string;
  jogosCadastrados: JogoOpcao[];
  atletas: PessoaSelecionavel[];
  comissao: PessoaSelecionavel[];
  staff: PessoaSelecionavel[];
}) {
  const [incluirJogo, setIncluirJogo] = useState(false);
  const [jogoSelecionadoId, setJogoSelecionadoId] = useState("");
  const jogoSelecionado = jogosCadastrados.find((j) => j.id === jogoSelecionadoId) ?? null;

  return (
    <form action={actionUrl} method="POST" target="_blank" className="space-y-5">
      <div className="card space-y-4 p-5">
        <TextField label="Título do documento" name="titulo" required defaultValue="Relação" />
        <TextAreaField label="Descrição (opcional)" name="descricao" rows={3} />

        <div className="flex items-center gap-2">
          <input
            id="incluirJogo"
            type="checkbox"
            checked={incluirJogo}
            onChange={(e) => setIncluirJogo(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
          />
          <label htmlFor="incluirJogo" className="text-sm font-medium text-neutral-700">
            Incluir informações de jogo
          </label>
        </div>

        {incluirJogo ? (
          <div className="space-y-4">
            {jogosCadastrados.length > 0 ? (
              <div>
                <label htmlFor="jogoCadastradoSelect" className="field-label">
                  Selecionar jogo cadastrado (opcional)
                </label>
                <select
                  id="jogoCadastradoSelect"
                  className="field-input"
                  value={jogoSelecionadoId}
                  onChange={(e) => setJogoSelecionadoId(e.target.value)}
                >
                  <option value="">Preencher manualmente</option>
                  {jogosCadastrados.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                key={`adversario-${jogoSelecionadoId}`}
                label="Adversário"
                name="jogoAdversario"
                placeholder="Ex: Paulista"
                defaultValue={jogoSelecionado?.adversario ?? ""}
              />
              <TextField
                key={`competicao-${jogoSelecionadoId}`}
                label="Competição"
                name="jogoCompeticao"
                placeholder="Ex: Copa Paulista"
                defaultValue={jogoSelecionado?.competicao ?? ""}
              />
              <TextField
                key={`data-${jogoSelecionadoId}`}
                label="Data"
                name="jogoData"
                type="date"
                defaultValue={jogoSelecionado?.data ?? ""}
              />
              <TextField
                key={`horario-${jogoSelecionadoId}`}
                label="Horário"
                name="jogoHorario"
                type="time"
                defaultValue={jogoSelecionado?.horario ?? ""}
              />
              <div className="sm:col-span-2">
                <TextField
                  key={`local-${jogoSelecionadoId}`}
                  label="Local"
                  name="jogoLocal"
                  placeholder="Ex: Estádio Conde Rodolfo Crespi"
                  defaultValue={jogoSelecionado?.local ?? ""}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">
            Quais dados devem aparecer
          </h3>
          <p className="text-xs text-neutral-400">
            Nome completo sempre aparece. Marque os demais dados do cadastro que quiser incluir.
          </p>
        </div>
        <GrupoColunas titulo="Dados gerais" colunas={COLUNAS_GERAIS} marcadasPorPadrao={COLUNAS_MARCADAS_POR_PADRAO} />
        <GrupoColunas titulo="Atletas" colunas={COLUNAS_ATLETAS} marcadasPorPadrao={COLUNAS_MARCADAS_POR_PADRAO} />
        <GrupoColunas
          titulo="Comissão Técnica"
          colunas={COLUNAS_COMISSAO}
          marcadasPorPadrao={COLUNAS_MARCADAS_POR_PADRAO}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListaSelecao titulo="Atletas" name="atleta" pessoas={atletas} />
        <ListaSelecao titulo="Comissão Técnica" name="comissao" pessoas={comissao} />
        <ListaSelecao titulo="Staff" name="staff" pessoas={staff} />
      </div>

      <button type="submit" className="btn-primary">
        Gerar PDF
      </button>
    </form>
  );
}
