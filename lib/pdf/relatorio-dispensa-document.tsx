import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  AssinaturasBlock,
  CORES,
  DocumentoFooter,
  formatCarimbo,
  formatDataBr,
  sharedStyles,
  type LogoSrc,
} from "./logistica-shared";

/**
 * Relatório de Dispensa de um atleta da Base que já é do clube (ver docs/superpowers/specs/
 * 2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) — diferente do Parecer Final
 * (`parecer-final-document.tsx`), que é só pra candidatos da Captação decidindo se entram ou não.
 * Reaproveita o mesmo padrão visual (caixas de identidade, grade de notas 3-9 com legenda) porque é
 * o mesmo tipo de documento formal do Departamento de Futebol de Base — só troca o conteúdo:
 * período no clube (início até a dispensa) e motivo, em vez de veredito de aprovação.
 */

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  foto: { width: 84, height: 104, borderRadius: 3, objectFit: "cover", borderWidth: 0.75, borderColor: "#c4c4c4" },
  fotoPlaceholder: {
    width: 84,
    height: 104,
    borderRadius: 3,
    backgroundColor: "#f5f5f5",
    borderWidth: 0.75,
    borderColor: "#c4c4c4",
  },
  tituloBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 8 },
  tituloTexto: {
    fontSize: 19,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  subtituloTexto: { fontSize: 10, color: "#404040", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  subtituloTextoSub: {
    fontSize: 8,
    color: "#737373",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textDecoration: "underline",
  },
  logo: { width: 52, height: 60, objectFit: "contain" },

  linhaCaixas: { flexDirection: "row", marginTop: -0.75 },
  caixa: { flex: 1, borderWidth: 0.75, borderColor: "#1a1a1a", marginLeft: -0.75 },
  caixaRotulo: {
    backgroundColor: CORES.grena,
    borderBottomWidth: 0.75,
    borderBottomColor: "#1a1a1a",
    paddingVertical: 3,
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  caixaValor: { paddingVertical: 6, paddingHorizontal: 4, fontSize: 9, color: "#1a1a1a", textAlign: "center" },

  notaCaixa: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 0.75,
    borderColor: "#1a1a1a",
    marginLeft: -0.75,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  notaRotulo: { fontSize: 8.5, fontWeight: 700, color: "#1a1a1a", textTransform: "uppercase" },
  notaValor: { fontSize: 11, fontWeight: 700, color: CORES.grenaEscuro },

  legendaBox: { borderWidth: 0.75, borderColor: "#1a1a1a", marginTop: 10 },
  legendaColuna: { flex: 1, borderRightWidth: 0.75, borderRightColor: "#1a1a1a" },
  legendaColunaUltima: { flex: 1 },
  legendaTexto: { fontSize: 7.5, color: "#1a1a1a", textAlign: "center", paddingVertical: 5 },

  secaoTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  motivoBox: { marginTop: 10 },
  motivoLabel: { fontSize: 8.5, fontWeight: 700, color: "#1a1a1a", textTransform: "uppercase" },
  motivoTexto: { fontSize: 9, color: "#1a1a1a", marginTop: 8, lineHeight: 1.5 },
  motivoVazio: { fontSize: 8.5, color: "#a3a3a3", marginTop: 8, fontStyle: "italic" },
});

function CaixaCampo({ label, valor, ultima }: { label: string; valor: string | null; ultima?: boolean }) {
  return (
    <View style={[styles.caixa, ultima ? { marginRight: -0.75 } : {}]}>
      <Text style={styles.caixaRotulo}>{label}</Text>
      <Text style={styles.caixaValor}>{valor ?? "—"}</Text>
    </View>
  );
}

function NotaCaixa({ label, valor, ultima }: { label: string; valor: number | null; ultima?: boolean }) {
  return (
    <View style={[styles.notaCaixa, ultima ? { marginRight: -0.75 } : {}]}>
      <Text style={styles.notaRotulo}>{label}</Text>
      <Text style={styles.notaValor}>{valor ?? "—"}</Text>
    </View>
  );
}

export interface RelatorioDispensaAtleta {
  nome: string;
  dataNascimento: string | null;
  categoria: string | null;
  posicao: string | null;
  dataInicioClube: string | null;
  dispensaData: string | null;
  motivo: string | null;
  notaTecnica: number | null;
  notaFisica: number | null;
  notaTatica: number | null;
  notaComportamental: number | null;
}

export function RelatorioDispensaDocument({
  juventusLogoSrc,
  fotoSrc,
  atleta,
  emitidoEm,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  atleta: RelatorioDispensaAtleta;
  emitidoEm: Date;
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.headerRow}>
          {fotoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.foto} src={fotoSrc as string} />
          ) : (
            <View style={styles.fotoPlaceholder} />
          )}
          <View style={styles.tituloBox}>
            <Text style={styles.tituloTexto}>Relatório de Dispensa</Text>
            <Text style={styles.subtituloTexto}>Desligamento de atleta</Text>
            <Text style={styles.subtituloTextoSub}>Departamento de Futebol de Base</Text>
          </View>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
        </View>

        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Nome do jogador" valor={atleta.nome} ultima />
        </View>
        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Data de nascimento" valor={formatDataBr(atleta.dataNascimento)} />
          <CaixaCampo label="Categoria" valor={atleta.categoria} />
          <CaixaCampo label="Posição" valor={atleta.posicao} ultima />
        </View>
        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Início no clube" valor={formatDataBr(atleta.dataInicioClube)} />
          <CaixaCampo label="Data da dispensa" valor={formatDataBr(atleta.dispensaData)} ultima />
        </View>

        <View style={styles.legendaBox}>
          <Text style={styles.caixaRotulo}>Legenda notas avaliativas (desempenho na saída)</Text>
          <View style={{ flexDirection: "row" }}>
            <View style={styles.legendaColuna}>
              <Text style={styles.legendaTexto}>3-4 Regular</Text>
            </View>
            <View style={styles.legendaColuna}>
              <Text style={styles.legendaTexto}>5-6 Bom</Text>
            </View>
            <View style={styles.legendaColuna}>
              <Text style={styles.legendaTexto}>7-8 Muito bom</Text>
            </View>
            <View style={styles.legendaColunaUltima}>
              <Text style={styles.legendaTexto}>9 - Excelente</Text>
            </View>
          </View>
        </View>

        <View style={[styles.linhaCaixas, { marginTop: 10 }]}>
          <NotaCaixa label="Técnica" valor={atleta.notaTecnica} />
          <NotaCaixa label="Física" valor={atleta.notaFisica} ultima />
        </View>
        <View style={[styles.linhaCaixas, { marginTop: -0.75 }]}>
          <NotaCaixa label="Tática" valor={atleta.notaTatica} />
          <NotaCaixa label="Comportamental" valor={atleta.notaComportamental} ultima />
        </View>

        <Text style={styles.secaoTitulo}>Motivo da dispensa</Text>
        <View style={styles.motivoBox}>
          {atleta.motivo ? (
            <Text style={styles.motivoTexto}>{atleta.motivo}</Text>
          ) : (
            <Text style={styles.motivoVazio}>Ainda não preenchido.</Text>
          )}
        </View>

        <AssinaturasBlock
          assinatura1={{ nome: "", cargo: "Treinador / Responsável pela avaliação" }}
          assinatura2={{ nome: "", cargo: "Departamento de Futebol de Base" }}
        />

        <Text style={{ fontSize: 7, color: "#a3a3a3", textAlign: "center", marginTop: 10 }}>
          Emitido em {formatCarimbo(emitidoEm)}
        </Text>

        <DocumentoFooter geradoEm={emitidoEm} />
      </Page>
    </Document>
  );
}
