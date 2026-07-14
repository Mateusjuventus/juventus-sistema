import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { JogoRow } from "@/lib/supabase/types";
import { formatCPF } from "@/lib/validation/cpf";
import { CORES, DocumentoFooter, DocumentoHeader, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

const styles = StyleSheet.create({
  onibusBox: {
    marginTop: 10,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  onibusTitulo: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro, marginBottom: 6 },
  tabela: { marginTop: 2 },
  linhaCabecalho: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    paddingBottom: 4,
    marginBottom: 3,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    alignItems: "center",
  },
  colNome: { flex: 1.6 },
  colNascimento: { width: 64 },
  colCpf: { width: 82 },
  colRg: { width: 74 },
  headerCell: { fontSize: 6.5, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellNome: { fontSize: 8, fontWeight: 700, color: "#1f1f1f" },
  emptyState: { fontSize: 8, color: "#a3a3a3", paddingVertical: 4 },
});

export interface OnibusPdfPassageiro {
  nome: string;
  dataNascimento: string | null;
  cpf: string | null;
  rg: string | null;
}

export interface OnibusPdfItem {
  numero: number;
  horario: string | null;
  passageiros: OnibusPdfPassageiro[];
}

export function OnibusDocument({
  jogo,
  juventusLogoSrc,
  adversarioLogoSrc,
  onibus,
}: {
  jogo: JogoRow;
  juventusLogoSrc: LogoSrc;
  adversarioLogoSrc: LogoSrc;
  onibus: OnibusPdfItem[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <DocumentoHeader
          jogo={jogo}
          juventusLogoSrc={juventusLogoSrc}
          adversarioLogoSrc={adversarioLogoSrc}
          titulo="Lista de Passageiros do Ônibus"
        />

        {onibus.length === 0 ? (
          <Text style={sharedStyles.emptyState}>Nenhum ônibus registrado.</Text>
        ) : (
          onibus.map((o) => (
            <View style={styles.onibusBox} key={o.numero} wrap={false}>
              <Text style={styles.onibusTitulo}>
                Ônibus {o.numero}
                {o.horario ? ` — Saída ${o.horario}` : ""}
              </Text>
              {o.passageiros.length === 0 ? (
                <Text style={styles.emptyState}>Sem passageiros.</Text>
              ) : (
                <View style={styles.tabela}>
                  <View style={styles.linhaCabecalho}>
                    <Text style={[styles.colNome, styles.headerCell]}>Nome Completo</Text>
                    <Text style={[styles.colNascimento, styles.headerCell]}>Nascimento</Text>
                    <Text style={[styles.colCpf, styles.headerCell]}>CPF</Text>
                    <Text style={[styles.colRg, styles.headerCell]}>RG</Text>
                  </View>
                  {o.passageiros.map((p, i) => (
                    <View style={styles.linha} key={i}>
                      <Text style={[styles.colNome, styles.cellNome]}>{p.nome}</Text>
                      <Text style={[styles.colNascimento, styles.cell]}>{formatDataBr(p.dataNascimento)}</Text>
                      <Text style={[styles.colCpf, styles.cell]}>{p.cpf ? formatCPF(p.cpf) : "—"}</Text>
                      <Text style={[styles.colRg, styles.cell]}>{p.rg ?? "—"}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
