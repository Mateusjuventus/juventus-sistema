import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import { CORES, DocumentoFooter, DocumentoHeader, sharedStyles, type LogoSrc } from "./logistica-shared";

// Nota: os estilos abaixo usam `fontFamily: "Helvetica-Bold"` (em vez de `fontWeight: 700`) para
// qualquer texto que precise de negrito de verdade — o react-pdf não deixa `fontWeight` em negrito
// nas fontes padrão (Helvetica) sem registrar variações extras, mesmo bug corrigido em
// lib/pdf/poster-shared.tsx (ver commit "Ajusta fontes/destaques dos pôsteres...").
const styles = StyleSheet.create({
  resumoRow: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 4 },
  resumoBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  resumoLabel: { fontSize: 7, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  resumoValor: { fontFamily: "Helvetica-Bold", fontSize: 16, color: CORES.grenaEscuro, marginTop: 2 },
  resumoValorNegativo: { color: "#b91c1c" },
  colData: { width: 70 },
  colQuantidade: { width: 90 },
  colObservacoes: { flex: 1 },
  colNome: { flex: 1 },
  colSolicitado: { width: 80 },
  colAtendido: { width: 80 },
  cell: { fontSize: 8, color: "#262626" },
  cellBold: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#262626" },
});

function formatDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export interface IngressosPdfCarga {
  data: string;
  quantidade: number;
  observacoes: string | null;
}

export interface IngressosPdfSolicitacao {
  nomeSolicitante: string;
  quantidadeSolicitada: number;
  quantidadeAtendida: number;
}

export function IngressosDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  cargas,
  solicitacoes,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  cargas: IngressosPdfCarga[];
  solicitacoes: IngressosPdfSolicitacao[];
}) {
  const totalRecebido = cargas.reduce((soma, c) => soma + c.quantidade, 0);
  const totalAtendido = solicitacoes.reduce((soma, s) => soma + s.quantidadeAtendida, 0);
  const saldoDisponivel = totalRecebido - totalAtendido;

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Carga de Ingressos"
        />

        <View style={styles.resumoRow}>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoLabel}>Total recebido</Text>
            <Text style={styles.resumoValor}>{totalRecebido}</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoLabel}>Total atendido</Text>
            <Text style={styles.resumoValor}>{totalAtendido}</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoLabel}>Saldo disponível</Text>
            <Text
              style={
                saldoDisponivel <= 0
                  ? [styles.resumoValor, styles.resumoValorNegativo]
                  : styles.resumoValor
              }
            >
              {saldoDisponivel}
            </Text>
          </View>
        </View>

        <Text style={sharedStyles.sectionTitulo}>Cargas recebidas</Text>
        {cargas.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma carga lançada para este jogo.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colData, sharedStyles.headerCell]}>Data</Text>
              <Text style={[styles.colQuantidade, sharedStyles.headerCell]}>Quantidade</Text>
              <Text style={[styles.colObservacoes, sharedStyles.headerCell]}>Observações</Text>
            </View>
            {cargas.map((c, i) => (
              <View style={sharedStyles.tableRow} key={i}>
                <Text style={[styles.colData, styles.cell]}>{formatDataBr(c.data)}</Text>
                <Text style={[styles.colQuantidade, styles.cellBold]}>{c.quantidade}</Text>
                <Text style={[styles.colObservacoes, styles.cell]}>{c.observacoes ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={sharedStyles.sectionTitulo}>Solicitações</Text>
        {solicitacoes.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhuma solicitação lançada para este jogo.</Text>
        ) : (
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeaderRow}>
              <Text style={[styles.colNome, sharedStyles.headerCell]}>Nome</Text>
              <Text style={[styles.colSolicitado, sharedStyles.headerCell]}>Solicitado</Text>
              <Text style={[styles.colAtendido, sharedStyles.headerCell]}>Atendido</Text>
            </View>
            {solicitacoes.map((s, i) => (
              <View style={sharedStyles.tableRow} key={i}>
                <Text style={[styles.colNome, styles.cellBold]}>{s.nomeSolicitante}</Text>
                <Text style={[styles.colSolicitado, styles.cell]}>{s.quantidadeSolicitada}</Text>
                <Text style={[styles.colAtendido, styles.cell]}>{s.quantidadeAtendida}</Text>
              </View>
            ))}
          </View>
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
