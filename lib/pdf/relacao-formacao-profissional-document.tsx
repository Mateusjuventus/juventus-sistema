import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DepartamentoEyebrow, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";
import { evolucoesDoContrato, type LinhaRelacao } from "@/lib/futebol/relacao-formacao-profissional";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { formatCPF } from "@/lib/validation/cpf";
import type { AtletaContratoEvolucaoSalarialRow, RubricaContrato } from "@/lib/supabase/types";

/**
 * Relação de Atletas (Formação e Profissional) pro Financeiro/Controladoria — ver
 * docs/superpowers/specs/2026-11-26-relacao-formacao-profissional-design.md. Duas tabelas de
 * colunas FIXAS (diferente de `relatorio-avulso-document.tsx`/`relacao-atletas-base-document.tsx`,
 * cujas colunas são escolhidas pelo usuário) — por isso landscape direto, sem a lógica de
 * `decidirOrientacao`: com as 5 rubricas + total + vigência já enchendo a largura mesmo em retrato,
 * e o bloco Profissional ainda ganhando a coluna de Evolução salarial.
 */

const RUBRICA_LABEL: Record<RubricaContrato, string> = {
  salario_ctps: "Salário CTPS",
  direito_imagem: "Direito de Imagem",
  bonificacao: "Bonificação",
  auxilio_moradia: "Auxílio Moradia",
  outros: "Outros",
};

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tipoContratoLabel(valor: string): string {
  return ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === valor)?.label ?? valor;
}

function textoEvolucoes(evolucoes: AtletaContratoEvolucaoSalarialRow[]): string {
  if (evolucoes.length === 0) return "—";
  return evolucoes.map((e) => `${formatDataBr(e.data_vigencia)}: ${RUBRICA_LABEL[e.rubrica]} → ${formatMoeda(e.novo_valor)}`).join("\n");
}

const styles = StyleSheet.create({
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
  },
  headerCell: { fontSize: 7, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  cell: { fontSize: 7.5, color: "#262626" },
  cellNome: { fontSize: 8, fontWeight: 700, color: "#1f1f1f" },
  col: { paddingRight: 4, flexShrink: 0 },
});

interface ColunaDef {
  chave: string;
  label: string;
  largura: number;
  valor: (l: LinhaRelacao, evolucoes: AtletaContratoEvolucaoSalarialRow[]) => string;
}

// Larguras pensadas pra caber em A4 paisagem (841.89 - 2*32 de padding da página - 2*8 de padding
// da linha = 761.89pt úteis), com folga — ver nota de `flexShrink: 0` em `relatorio-avulso-
// document.tsx`: sem isso o motor de layout encolhe as colunas de volta, ignorando o piso definido
// aqui.
const COLUNAS_FORMACAO: ColunaDef[] = [
  { chave: "nome", label: "Nome", largura: 100, valor: (l) => l.atleta.nomeCompleto },
  { chave: "cpf", label: "CPF", largura: 72, valor: (l) => (l.atleta.cpf ? formatCPF(l.atleta.cpf) : "—") },
  { chave: "nascimento", label: "Nascimento", largura: 55, valor: (l) => formatDataBr(l.atleta.dataNascimento) },
  { chave: "tipo", label: "Tipo de contrato", largura: 70, valor: (l) => tipoContratoLabel(l.contrato.tipo_contrato) },
  {
    chave: "vigencia",
    label: "Vigência",
    largura: 78,
    valor: (l) => `${formatDataBr(l.contrato.vigencia_inicio)} – ${formatDataBr(l.contrato.vigencia_fim)}`,
  },
  { chave: "salario_ctps", label: "Salário CTPS", largura: 56, valor: (l) => formatMoeda(l.contrato.salario_ctps) },
  { chave: "direito_imagem", label: "Direito de Imagem", largura: 56, valor: (l) => formatMoeda(l.contrato.direito_imagem) },
  { chave: "bonificacao", label: "Bonificação", largura: 56, valor: (l) => formatMoeda(l.contrato.bonificacao) },
  { chave: "auxilio_moradia", label: "Auxílio Moradia", largura: 56, valor: (l) => formatMoeda(l.contrato.auxilio_moradia) },
  { chave: "outros", label: "Outros", largura: 50, valor: (l) => formatMoeda(l.contrato.outros) },
  { chave: "total", label: "Valor Total", largura: 60, valor: (l) => formatMoeda(l.valorTotal) },
];

// Mesmas colunas de `COLUNAS_FORMACAO`, só um pouco mais estreitas (ver larguras acima) pra abrir
// espaço pra "Evolução salarial" — só faz sentido no bloco Profissional (ver spec).
const COLUNAS_PROFISSIONAL: ColunaDef[] = [
  { chave: "nome", label: "Nome", largura: 80, valor: (l) => l.atleta.nomeCompleto },
  { chave: "cpf", label: "CPF", largura: 62, valor: (l) => (l.atleta.cpf ? formatCPF(l.atleta.cpf) : "—") },
  { chave: "nascimento", label: "Nascimento", largura: 48, valor: (l) => formatDataBr(l.atleta.dataNascimento) },
  {
    chave: "tipo",
    label: "Tipo de contrato",
    largura: 60,
    valor: (l) =>
      l.contrato.tipo_contrato === "emprestimo" && l.contrato.clube_origem
        ? `${tipoContratoLabel(l.contrato.tipo_contrato)} (${l.contrato.clube_origem})`
        : tipoContratoLabel(l.contrato.tipo_contrato),
  },
  {
    chave: "vigencia",
    label: "Vigência",
    largura: 68,
    valor: (l) => `${formatDataBr(l.contrato.vigencia_inicio)} – ${formatDataBr(l.contrato.vigencia_fim)}`,
  },
  { chave: "salario_ctps", label: "Salário CTPS", largura: 48, valor: (l) => formatMoeda(l.contrato.salario_ctps) },
  { chave: "direito_imagem", label: "Direito de Imagem", largura: 48, valor: (l) => formatMoeda(l.contrato.direito_imagem) },
  { chave: "bonificacao", label: "Bonificação", largura: 48, valor: (l) => formatMoeda(l.contrato.bonificacao) },
  { chave: "auxilio_moradia", label: "Auxílio Moradia", largura: 48, valor: (l) => formatMoeda(l.contrato.auxilio_moradia) },
  { chave: "outros", label: "Outros", largura: 42, valor: (l) => formatMoeda(l.contrato.outros) },
  { chave: "total", label: "Valor Total", largura: 52, valor: (l) => formatMoeda(l.valorTotal) },
  { chave: "evolucao", label: "Evolução salarial", largura: 110, valor: (_l, evolucoes) => textoEvolucoes(evolucoes) },
];

function TabelaBloco({
  titulo,
  linhas,
  colunas,
  todasEvolucoes,
}: {
  titulo: string;
  linhas: LinhaRelacao[];
  colunas: ColunaDef[];
  /** `[]` pro bloco Formação (a coluna de evolução nem existe lá, mas a assinatura fica uniforme). */
  todasEvolucoes: AtletaContratoEvolucaoSalarialRow[];
}) {
  return (
    <View>
      <Text style={styles.secaoTitulo}>
        {titulo} ({linhas.length})
      </Text>
      {linhas.length === 0 ? (
        <Text style={sharedStyles.emptyState}>Nenhum atleta nesta relação.</Text>
      ) : (
        <View style={sharedStyles.table}>
          <View style={styles.tableHeaderRow}>
            {colunas.map((c) => (
              <Text key={c.chave} style={[styles.col, styles.headerCell, { width: c.largura }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {linhas.map((l) => {
            const evolucoes = evolucoesDoContrato(l.contrato.id, todasEvolucoes);
            return (
              <View style={styles.tableRow} key={l.atleta.id}>
                {colunas.map((c) => (
                  <Text
                    key={c.chave}
                    style={[styles.col, c.chave === "nome" ? styles.cellNome : styles.cell, { width: c.largura }]}
                  >
                    {c.valor(l, evolucoes)}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function RelacaoFormacaoProfissionalDocument({
  juventusLogoSrc,
  formacao,
  profissional,
  evolucoes,
  geradoEm,
}: {
  juventusLogoSrc: LogoSrc;
  formacao: LinhaRelacao[];
  profissional: LinhaRelacao[];
  /** Todas as evoluções salariais já lançadas no sistema — a tabela do bloco Profissional filtra
   * pelo `contrato_id` de cada linha na hora (ver `evolucoesDoContrato`). */
  evolucoes: AtletaContratoEvolucaoSalarialRow[];
  geradoEm: Date;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={sharedStyles.page}>
        <DepartamentoEyebrow departamento="base" />
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Relação de Atletas — Formação e Profissional</Text>
        <Text style={styles.subtitulo}>Futebol de Base — Financeiro/Controladoria</Text>

        <TabelaBloco titulo="Formação" linhas={formacao} colunas={COLUNAS_FORMACAO} todasEvolucoes={[]} />
        <TabelaBloco titulo="Profissional" linhas={profissional} colunas={COLUNAS_PROFISSIONAL} todasEvolucoes={evolucoes} />

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
