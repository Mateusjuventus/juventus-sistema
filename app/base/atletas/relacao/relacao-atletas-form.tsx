"use client";

import { CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";

interface OpcaoColuna {
  name: string;
  label: string;
}

/** Mesmo conjunto de colunas de Atleta do Relatório Avulso (`relatorio-avulso-form-base.tsx`), MENOS
 * "Categoria" (aqui ela já é o título de cada seção do PDF) e MAIS "Classificação" (G1/G2/G3/
 * Dispensa pendente — não existia em nenhum relatório em PDF até então). Defaults marcados: os
 * mesmos do Avulso (Nascimento, CPF, RG, Telefone, Posição) mais Nº Camisa, Situação e
 * Classificação — fazem mais sentido como "roster" padrão do que os defaults do Avulso, pensados
 * pra outro caso de uso (ver a spec).
 *
 * "Contrato de formação" (Sim/Não) saiu em 18/11/2026 — checava um campo (`possui_contrato_
 * formacao`) que ficou legado desde a migração 0097 ("Formação" virou um valor próprio de
 * `tipo_contrato`, não mais um sub-flag de "Amador"), então sempre mostrava "—"; "Tipo de contrato"
 * já cobre essa informação corretamente. No lugar entraram "Dados de pagamento (PF)"/"(PJ)" —
 * pedido do Mateus, cada um combinando banco/agência/conta (ou nome da empresa/CNPJ) numa coluna só,
 * pra não estourar o teto de 8 colunas simultâneas do documento (ver `relacao-atletas-base-
 * document.tsx`). */
const COLUNAS_MARCADAS_POR_PADRAO = new Set([
  "colNascimento",
  "colCpf",
  "colRg",
  "colTelefone",
  "colPosicao",
  "colNumeroCamisa",
  "colStatus",
  "colClassificacao",
]);

const COLUNAS: OpcaoColuna[] = [
  { name: "colApelido", label: "Apelido" },
  { name: "colNascimento", label: "Data de nascimento" },
  { name: "colCpf", label: "CPF" },
  { name: "colRg", label: "RG" },
  { name: "colTelefone", label: "Telefone" },
  { name: "colPosicao", label: "Posição" },
  { name: "colNumeroCamisa", label: "Nº da camisa" },
  { name: "colNumeroRegistro", label: "Nº CBF/FPF" },
  { name: "colPeDominante", label: "Pé dominante" },
  { name: "colNaturalidade", label: "Naturalidade" },
  { name: "colEndereco", label: "Endereço" },
  { name: "colDataInicioClube", label: "Início no clube" },
  { name: "colTipoContrato", label: "Tipo de contrato" },
  { name: "colDataFimContrato", label: "Fim de contrato" },
  { name: "colEmpresarioNome", label: "Empresário" },
  { name: "colPagamentoPf", label: "Dados de pagamento (PF)" },
  { name: "colPagamentoPj", label: "Dados de pagamento (PJ)" },
  { name: "colStatus", label: "Situação" },
  { name: "colClassificacao", label: "Classificação" },
];

const STATUS_OPCOES: { name: string; label: string }[] = [
  { name: "status_liberado", label: "Liberado" },
  { name: "status_suspenso", label: "Suspenso" },
  { name: "status_departamento_medico", label: "Departamento Médico" },
  { name: "status_dispensado", label: "Dispensado" },
];

const STATUS_MARCADOS_POR_PADRAO = new Set(["status_liberado"]);

/** Filtro "Quais tipos de contrato incluir" (pedido do Mateus em 18/11/2026, pra poder gerar uma
 * relação só com quem tem Contrato de Formação, por exemplo) — mesmo padrão de checkbox e mesmo
 * fallback de "Quais status incluir" (nenhum marcado = todos). "Sem contrato" não existe no enum do
 * banco: representa quem ainda não tem nenhum contrato cadastrado — ver `tipoContratoParaFiltro`/
 * `atletaPassaFiltroTipoContrato` em lib/futebol/relacao-atletas-base.ts. */
const TIPO_CONTRATO_OPCOES: { name: string; label: string }[] = [
  { name: "tipoContrato_definitivo", label: "Definitivo" },
  { name: "tipoContrato_emprestimo", label: "Empréstimo" },
  { name: "tipoContrato_amador", label: "Amador" },
  { name: "tipoContrato_formacao", label: "Formação" },
  { name: "tipoContrato_iniciacao", label: "Iniciação" },
  { name: "tipoContrato_sem_contrato", label: "Sem contrato" },
];

/**
 * Formulário da Relação de Atletas da Base (ver docs/superpowers/specs/2026-09-04-relacao-atletas-
 * base-design.md) — envio é um POST simples de formulário (sem Server Action), mesmo padrão do
 * Relatório Avulso: abre o PDF numa aba nova.
 */
export function RelacaoAtletasForm({ categoriaInicial }: { categoriaInicial: CategoriaBase | "todas" }) {
  // Checkboxes (multi-seleção), não um `<select>` de escolha única — pedido do Mateus pra poder
  // combinar categorias específicas (ex.: Sub-20 + Sub-17) em vez de só "uma" ou "todas". Vindo do
  // botão "Exportar relação" da tela de uma categoria só (`?categoria=`), só aquela começa marcada;
  // vindo do botão da tela principal de Atletas (`categoriaInicial === "todas"`), todas começam
  // marcadas — ver `categoriasParaFiltro` (nenhuma marcada na hora de gerar cai de volta pra
  // "todas", mesma lógica de fallback do filtro de status).
  const categoriaMarcadaPorPadrao = (valor: CategoriaBase) => categoriaInicial === "todas" || categoriaInicial === valor;

  return (
    <form action="/base/atletas/relacao/pdf" method="POST" target="_blank" className="space-y-5">
      <div className="card space-y-4 p-5">
        <div>
          <h3 className="field-label mb-2">Quais categorias incluir</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIAS_BASE.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categorias"
                  value={c.value}
                  defaultChecked={categoriaMarcadaPorPadrao(c.value)}
                  className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                />
                <span className="text-neutral-700">{c.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Nenhuma marcada = inclui todas as categorias.</p>
        </div>

        <div>
          <h3 className="field-label mb-2">Quais status incluir</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUS_OPCOES.map((s) => (
              <label key={s.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={s.name}
                  defaultChecked={STATUS_MARCADOS_POR_PADRAO.has(s.name)}
                  className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                />
                <span className="text-neutral-700">{s.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Nenhum marcado = inclui todos os status.</p>
        </div>

        <div>
          <h3 className="field-label mb-2">Quais tipos de contrato incluir</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPO_CONTRATO_OPCOES.map((t) => (
              <label key={t.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={t.name}
                  className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                />
                <span className="text-neutral-700">{t.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Nenhum marcado = inclui todos os tipos (e quem não tem contrato).</p>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">
            Quais dados devem aparecer
          </h3>
          <p className="text-xs text-neutral-400">Nome completo sempre aparece.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLUNAS.map((coluna) => (
            <label key={coluna.name} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={coluna.name}
                defaultChecked={COLUNAS_MARCADAS_POR_PADRAO.has(coluna.name)}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              <span className="text-neutral-700">{coluna.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary">
        Gerar PDF
      </button>
    </form>
  );
}
