import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  AssinaturasBlockDinamico,
  CORES,
  DocumentoFooter,
  formatCarimbo,
  formatDataBr,
  sharedStyles,
  type AssinaturaInfo,
  type LogoSrc,
} from "./logistica-shared";

/**
 * Parecer Social — documentação formal do acompanhamento da Assistência Social sobre um atleta da
 * Base (ver docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md, Parte 1).
 * Reaproveita o mesmo padrão visual dos outros documentos oficiais do Futebol de Base (caixas de
 * identidade, bloco de assinatura) — diferente do Relatório de Dispensa, aqui não há grade de
 * notas nem motivo de desligamento: o corpo é o histórico de atendimentos, em ordem cronológica, e
 * a assinatura é única (Assistente Social), sempre já assinada no momento da geração — não existe
 * aqui um segundo papel pendente de aprovação.
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

  atendimentoBox: {
    borderWidth: 0.75,
    borderColor: "#d4d4d4",
    borderRadius: 2,
    marginTop: 8,
    padding: 8,
  },
  atendimentoData: { fontSize: 9, fontWeight: 700, color: CORES.grenaEscuro },
  atendimentoAnotacoes: { fontSize: 9, color: "#1a1a1a", marginTop: 4, lineHeight: 1.4 },
  atendimentoEncaminhamentoLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#525252",
    textTransform: "uppercase",
    marginTop: 6,
  },
  atendimentoEncaminhamentoTexto: { fontSize: 8.5, color: "#404040", marginTop: 2, lineHeight: 1.4 },

  vazioTexto: { fontSize: 8.5, color: "#a3a3a3", marginTop: 8, fontStyle: "italic" },
});

function CaixaCampo({ label, valor, ultima }: { label: string; valor: string | null; ultima?: boolean }) {
  return (
    <View style={[styles.caixa, ultima ? { marginRight: -0.75 } : {}]}>
      <Text style={styles.caixaRotulo}>{label}</Text>
      <Text style={styles.caixaValor}>{valor ?? "—"}</Text>
    </View>
  );
}

export interface ParecerSocialAtendimento {
  data: string;
  anotacoes: string;
  encaminhamento: string | null;
}

export interface ParecerSocialAtleta {
  nome: string;
  dataNascimento: string | null;
  categoria: string | null;
}

/** `nome`/`cargo` de quem assinou — `null` só é possível se a assinatura automática falhar (sem
 * assinatura cadastrada); nesse caso o bloco aparece pendente, mesmo não havendo aprovação de
 * terceiros nesse papel. */
export interface ParecerSocialAssinatura {
  nome: string;
  cargo: string | null;
  assinadoEm: string;
  assinaturaImagemSrc: string | null;
}

export function ParecerSocialDocument({
  juventusLogoSrc,
  fotoSrc,
  atleta,
  atendimentos,
  emitidoEm,
  assinatura,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  atleta: ParecerSocialAtleta;
  atendimentos: ParecerSocialAtendimento[];
  emitidoEm: Date;
  assinatura: ParecerSocialAssinatura | null;
}) {
  const assinaturaInfo: AssinaturaInfo = assinatura
    ? {
        nome: assinatura.nome,
        cargo: assinatura.cargo ?? "Assistente Social",
        assinadoDigitalmenteEm: assinatura.assinadoEm,
        assinaturaImagemSrc: assinatura.assinaturaImagemSrc,
      }
    : { nome: "", cargo: "Assistente Social", pendente: true };

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
            <Text style={styles.tituloTexto}>Parecer Social</Text>
            <Text style={styles.subtituloTexto}>Acompanhamento da Assistência Social</Text>
            <Text style={styles.subtituloTextoSub}>Departamento de Futebol de Base</Text>
          </View>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
        </View>

        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Nome do atleta" valor={atleta.nome} ultima />
        </View>
        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Data de nascimento" valor={formatDataBr(atleta.dataNascimento)} />
          <CaixaCampo label="Categoria" valor={atleta.categoria} ultima />
        </View>

        <Text style={styles.secaoTitulo}>Histórico de atendimentos</Text>
        {atendimentos.length === 0 ? (
          <Text style={styles.vazioTexto}>Nenhum atendimento registrado até o momento.</Text>
        ) : (
          atendimentos.map((atendimento, i) => (
            <View style={styles.atendimentoBox} key={i} wrap={false}>
              <Text style={styles.atendimentoData}>{formatDataBr(atendimento.data)}</Text>
              <Text style={styles.atendimentoAnotacoes}>{atendimento.anotacoes}</Text>
              {atendimento.encaminhamento ? (
                <>
                  <Text style={styles.atendimentoEncaminhamentoLabel}>Encaminhamento</Text>
                  <Text style={styles.atendimentoEncaminhamentoTexto}>{atendimento.encaminhamento}</Text>
                </>
              ) : null}
            </View>
          ))
        )}

        <AssinaturasBlockDinamico assinaturas={[assinaturaInfo]} />

        <Text style={{ fontSize: 7, color: "#a3a3a3", textAlign: "center", marginTop: 10 }}>
          Emitido em {formatCarimbo(emitidoEm)}
        </Text>

        <DocumentoFooter geradoEm={emitidoEm} />
      </Page>
    </Document>
  );
}
