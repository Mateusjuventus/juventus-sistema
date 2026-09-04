import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { formatCPF } from "@/lib/validation/cpf";
import { CORES, DepartamentoEyebrow, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import type { RelacaoAtletasGrupo } from "@/lib/futebol/relacao-atletas-base";
import type { CategoriaBase } from "@/lib/auth/categorias-base";

/**
 * Relação de Atletas da Base, sempre organizada por categoria (Sub-20 → Sub-11) — ver
 * docs/superpowers/specs/2026-09-04-relacao-atletas-base-design.md. Diferente do Relatório Avulso
 * (`relatorio-avulso-document.tsx`, que junta Atletas + Comissão Técnica + Staff numa lista só),
 * este documento é só de Atletas, sempre quebrado em uma seção por categoria — mesmo padrão visual
 * de seção de `relatorio-geral-base-document.tsx` (faixa-título "Sub-20 (12)" + "Nenhum atleta
 * cadastrado nessa categoria" quando vazia). As colunas exibidas são escolhidas pelo usuário, com a
 * mesma técnica de largura fixa por coluna de `relatorio-avulso-document.tsx` (evita o vazamento de
 * texto entre colunas quando várias são marcadas ao mesmo tempo) — mas SEM a coluna "Categoria" (já
 * é o título de cada seção aqui) e COM uma coluna nova "Classificação" (G1/G2/G3/Dispensa
 * pendente), que nenhum documento em PDF do sistema mostrava até então. Orientação da página
 * dinâmica (retrato ou paisagem) conforme quantas colunas o usuário marcar — ver
 * `decidirOrientacao` abaixo.
 */

const styles = StyleSheet.create({
  // `juventus-escudo.png` (pedido do Mateus: a versão com as duas estrelas, não a `-mark` sem
  // estrelas que o Avulso usa) — imagem quadrada com bastante espaço em branco acima do círculo
  // pras estrelas, então a caixa aqui é mais alta que larga (proporção diferente do `-mark`) pra o
  // círculo ficar com um tamanho parecido ao de antes.
  headerLogo: { width: 50, height: 62, alignSelf: "center", objectFit: "contain", marginTop: 2 },
  titulo: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 10 },
  secaoTitulo: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#404040",
    backgroundColor: "#EEF0F2",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#f5f5f5",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  headerCell: { fontSize: 7, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellNome: { fontSize: 8.5, fontWeight: 700, color: "#1f1f1f" },
  // `flexShrink: 0` — mesmo motivo de `relatorio-avulso-document.tsx`: sem isso o motor de layout
  // encolhe as colunas de volta pra caber na página, ignorando o piso definido em `larguraColunas`.
  colNome: { paddingRight: 4, flexShrink: 0 },
  colExtra: { paddingRight: 4, flexShrink: 0 },
});

// Largura útil da tabela em pontos, uma pra cada orientação de página possível (ver
// `decidirOrientacao` abaixo) — mesmo cálculo de `relatorio-avulso-document.tsx`: tamanho do papel
// menos os `padding: 32` de `sharedStyles.page` dos dois lados e o `paddingHorizontal: 8` de
// `tableRow`/`tableHeaderRow`, também dos dois lados.
const LARGURA_TABELA_RETRATO = 595.28 - 2 * 32 - 2 * 8;
const LARGURA_TABELA_PAISAGEM = 841.89 - 2 * 32 - 2 * 8;
const LARGURA_EXTRA_MINIMA = 72;
const LARGURA_NOME_MINIMA = 110;
// 8 — teto de colunas extras simultâneas, qualquer que seja a orientação escolhida (ver
// `decidirOrientacao`). Calculado pra garantir que a pior combinação possível (8 colunas no piso de
// 72pt, incluindo a única com piso maior, "Endereço" a 110pt) sempre caiba dentro de
// `LARGURA_TABELA_PAISAGEM` sem depender de nenhum encolhimento do motor de layout do react-pdf —
// foi exatamente esse encolhimento "escondido" (mesmo com `flexShrink: 0`) que causava o texto de
// colunas incompressíveis (sem espaço pra quebrar linha, como CPF/RG) vazando por cima da coluna
// vizinha quando a soma das larguras fixas não cabia na largura disponível (ver o debug visual
// feito ao investigar esse bug).
const LIMITE_COLUNAS_EXTRAS = 8;

function larguraColunas(colunasAtivas: ColunaDef[], larguraTabela: number): { nome: number; porColuna: number[] } {
  const porColuna = colunasAtivas.map((c) => c.larguraMinima ?? LARGURA_EXTRA_MINIMA);
  const somaExtras = porColuna.reduce((soma, largura) => soma + largura, 0);
  const nome = Math.max(LARGURA_NOME_MINIMA, larguraTabela - somaExtras);
  return { nome, porColuna };
}

/** Retrato (A4 normal) quando as colunas marcadas cabem confortavelmente; paisagem só quando não
 * cabem — pedido do Mateus pra não gastar papel/tela à toa numa relação com poucos dados (ex.: só
 * Situação) só porque o documento é capaz de mostrar muito mais colunas do que isso. Mesma conta de
 * `larguraColunas`, mas contra o orçamento do retrato: se a soma das colunas marcadas (nos seus
 * pisos mínimos) mais o mínimo da coluna Nome couber em `LARGURA_TABELA_RETRATO`, fica em retrato. */
function decidirOrientacao(colunasAtivas: ColunaDef[]): "portrait" | "landscape" {
  const somaExtras = colunasAtivas.reduce((soma, c) => soma + (c.larguraMinima ?? LARGURA_EXTRA_MINIMA), 0);
  return somaExtras + LARGURA_NOME_MINIMA <= LARGURA_TABELA_RETRATO ? "portrait" : "landscape";
}

/** Um atleta já com todos os rótulos resolvidos (pé dominante, tipo de contrato, situação,
 * classificação) — o documento só exibe o texto, sem conhecer nenhum enum/catálogo. */
export interface RelacaoAtletaLinha {
  categoria: CategoriaBase;
  nome: string;
  apelido: string | null;
  dataNascimento: string | null;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  posicao: string | null;
  numeroCamisa: number | null;
  numeroRegistro: string | null;
  peDominante: string | null;
  naturalidade: string | null;
  endereco: string | null;
  dataInicioClube: string | null;
  tipoContrato: string | null;
  dataFimContrato: string | null;
  contratoFormacao: boolean | null;
  empresarioNome: string | null;
  status: string | null;
  classificacao: string | null;
}

export interface RelacaoAtletasColunas {
  apelido: boolean;
  nascimento: boolean;
  cpf: boolean;
  rg: boolean;
  telefone: boolean;
  posicao: boolean;
  numeroCamisa: boolean;
  numeroRegistro: boolean;
  peDominante: boolean;
  naturalidade: boolean;
  endereco: boolean;
  dataInicioClube: boolean;
  tipoContrato: boolean;
  dataFimContrato: boolean;
  contratoFormacao: boolean;
  empresarioNome: boolean;
  status: boolean;
  classificacao: boolean;
}

interface ColunaDef {
  chave: keyof RelacaoAtletasColunas;
  label: string;
  valor: (a: RelacaoAtletaLinha) => string;
  larguraMinima?: number;
}

const COLUNAS_DISPONIVEIS: ColunaDef[] = [
  { chave: "apelido", label: "Apelido", valor: (a) => a.apelido ?? "—" },
  { chave: "nascimento", label: "Nascimento", valor: (a) => formatDataBr(a.dataNascimento) },
  { chave: "cpf", label: "CPF", valor: (a) => (a.cpf ? formatCPF(a.cpf) : "—") },
  { chave: "rg", label: "RG", valor: (a) => a.rg ?? "—" },
  { chave: "telefone", label: "Telefone", valor: (a) => a.telefone ?? "—" },
  { chave: "posicao", label: "Posição", valor: (a) => a.posicao ?? "—" },
  { chave: "numeroCamisa", label: "Nº Camisa", valor: (a) => (a.numeroCamisa != null ? String(a.numeroCamisa) : "—") },
  { chave: "numeroRegistro", label: "Nº CBF/FPF", valor: (a) => a.numeroRegistro ?? "—" },
  { chave: "peDominante", label: "Pé dominante", valor: (a) => a.peDominante ?? "—" },
  { chave: "naturalidade", label: "Naturalidade", valor: (a) => a.naturalidade ?? "—" },
  { chave: "endereco", label: "Endereço", valor: (a) => a.endereco ?? "—", larguraMinima: 110 },
  { chave: "dataInicioClube", label: "Início no clube", valor: (a) => formatDataBr(a.dataInicioClube) },
  { chave: "tipoContrato", label: "Tipo de contrato", valor: (a) => a.tipoContrato ?? "—" },
  { chave: "dataFimContrato", label: "Fim de contrato", valor: (a) => formatDataBr(a.dataFimContrato) },
  {
    chave: "contratoFormacao",
    label: "Contrato de formação",
    valor: (a) => (a.contratoFormacao == null ? "—" : a.contratoFormacao ? "Sim" : "Não"),
  },
  { chave: "empresarioNome", label: "Empresário", valor: (a) => a.empresarioNome ?? "—" },
  { chave: "status", label: "Situação", valor: (a) => a.status ?? "—" },
  { chave: "classificacao", label: "Classificação", valor: (a) => a.classificacao ?? "—" },
];

function TabelaAtletas({
  grupo,
  colunasAtivas,
  larguraNome,
  largurasExtras,
}: {
  grupo: RelacaoAtletasGrupo<RelacaoAtletaLinha>;
  colunasAtivas: ColunaDef[];
  larguraNome: number;
  largurasExtras: number[];
}) {
  return (
    <View>
      <Text style={styles.secaoTitulo}>
        {grupo.categoriaLabel} ({grupo.atletas.length})
      </Text>
      {grupo.atletas.length === 0 ? (
        <Text style={sharedStyles.emptyState}>Nenhum atleta cadastrado nessa categoria.</Text>
      ) : (
        <View style={sharedStyles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colNome, styles.headerCell, { width: larguraNome }]}>Nome completo</Text>
            {colunasAtivas.map((c, i) => (
              <Text key={c.chave} style={[styles.colExtra, styles.headerCell, { width: largurasExtras[i] }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {grupo.atletas.map((a, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={[styles.colNome, styles.cellNome, { width: larguraNome }]}>{a.nome}</Text>
              {colunasAtivas.map((c, j) => (
                <Text key={c.chave} style={[styles.colExtra, styles.cell, { width: largurasExtras[j] }]}>
                  {c.valor(a)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function RelacaoAtletasBaseDocument({
  juventusLogoSrc,
  escopoTexto,
  grupos,
  colunas,
  geradoEm,
}: {
  juventusLogoSrc: LogoSrc;
  /** "Todas as Categorias" (as 7 selecionadas) ou a lista das categorias selecionadas, na ordem
   * canônica (ex.: "Sub-20, Sub-17") — vira o subtítulo. Pedido do Mateus: só a categoria aparece
   * aqui, sem o status (o status ainda filtra os atletas normalmente, só não é exibido). */
  escopoTexto: string;
  grupos: RelacaoAtletasGrupo<RelacaoAtletaLinha>[];
  colunas: RelacaoAtletasColunas;
  geradoEm: Date;
}) {
  const colunasAtivas = COLUNAS_DISPONIVEIS.filter((c) => colunas[c.chave]).slice(0, LIMITE_COLUNAS_EXTRAS);
  const orientacao = decidirOrientacao(colunasAtivas);
  const larguraTabela = orientacao === "landscape" ? LARGURA_TABELA_PAISAGEM : LARGURA_TABELA_RETRATO;
  const { nome: larguraNome, porColuna: largurasExtras } = larguraColunas(colunasAtivas, larguraTabela);

  return (
    <Document>
      <Page size="A4" orientation={orientacao} style={sharedStyles.page}>
        <DepartamentoEyebrow departamento="base" />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relação de Atletas</Text>
        <Text style={styles.subtitulo}>{escopoTexto}</Text>

        {grupos.map((grupo) => (
          <TabelaAtletas
            key={grupo.categoria}
            grupo={grupo}
            colunasAtivas={colunasAtivas}
            larguraNome={larguraNome}
            largurasExtras={largurasExtras}
          />
        ))}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
