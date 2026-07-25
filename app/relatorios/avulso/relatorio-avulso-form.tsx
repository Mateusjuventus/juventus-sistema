"use client";

import { useState } from "react";
import { TextField, TextAreaField } from "@/components/fields";

export interface PessoaSelecionavel {
  id: string;
  nome: string;
  extra: string;
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

/**
 * Formulário do relatório/lista avulsa: monta um PDF sob medida (título, descrição, informações de
 * jogo opcionais, quem entra e quais colunas aparecem) sem depender de nenhum jogo já convocado.
 * Envio é um POST simples de formulário (sem Server Action) — abre o PDF numa aba nova, igual a
 * qualquer link "Gerar PDF" do sistema, só que apontando pra uma rota que lê os dados do corpo do
 * POST em vez de um `id` de jogo na URL.
 */
export function RelatorioAvulsoForm({
  actionUrl,
  atletas,
  comissao,
  staff,
}: {
  actionUrl: string;
  atletas: PessoaSelecionavel[];
  comissao: PessoaSelecionavel[];
  staff: PessoaSelecionavel[];
}) {
  const [incluirJogo, setIncluirJogo] = useState(false);

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Adversário" name="jogoAdversario" placeholder="Ex: Paulista" />
            <TextField label="Competição" name="jogoCompeticao" placeholder="Ex: Copa Paulista" />
            <TextField label="Data" name="jogoData" type="date" />
            <TextField label="Horário" name="jogoHorario" type="time" />
            <div className="sm:col-span-2">
              <TextField label="Local" name="jogoLocal" placeholder="Ex: Estádio Conde Rodolfo Crespi" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">
          Quais dados devem aparecer
        </h3>
        <p className="text-xs text-neutral-400">Nome completo sempre aparece.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { name: "colNascimento", label: "Data de nascimento" },
            { name: "colCpf", label: "CPF" },
            { name: "colRg", label: "RG" },
            { name: "colTelefone", label: "Telefone" },
            { name: "colExtra", label: "Posição/Função" },
          ].map((coluna) => (
            <label key={coluna.name} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={coluna.name}
                defaultChecked
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              <span className="text-neutral-700">{coluna.label}</span>
            </label>
          ))}
        </div>
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
