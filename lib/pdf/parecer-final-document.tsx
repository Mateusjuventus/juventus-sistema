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
 * Parecer Final de Avaliação da Captação/Avaliação — no molde do modelo do Corinthians enviado
 * pelo Mateus, com a marca do Juventus. Ver docs/superpowers/specs/
 * 2026-08-19-parecer-final-treinador-design.md. Reaproveita `logistica-shared.tsx` (cabeçalho de
 * cores, rodapé, bloco de assinaturas) do mesmo jeito que `captacao-document.tsx` já faz.
 *
 * "Apelido" do modelo do Corinthians fica de fora de propósito: `captacao_base` não tem esse campo
 * hoje e não foi pedido.
 */

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  logo: { width: 40, height: 45, objectFit: "contain", marginRight: 10 },
  tituloBox: { flex: 1 },
  tituloTexto: {
    fontSize: 14,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  subtituloTexto: { fontSize: 8.5, color: "#525252", marginTop: 2 },

  candidatoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  foto: { width: 70, height: 70, borderRadius: 6, objectFit: "cover" },
  fotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#d4d4d4",
  },
  nomeCandidato: { fontSize: 15, fontWeight: 700, color: CORES.grenaEscuro },

  secaoTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: CORES.grena,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dadosGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  dadoItem: { width: "33%", marginBottom: 8, paddingRight: 8 },
  dadoLabel: { fontSize: 7.5, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  dadoValor: { fontSize: 9.5, color: "#1f1f1f", marginTop: 1 },

  notasRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  notaBox: { width: 118, borderWidth: 0.5, borderColor: "#e5e5e5", borderRadius: 4, padding: 8 },
  notaLabel: { fontSize: 7, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  notaValor: { fontSize: 18, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 2 },
  legenda: { fontSize: 7.5, color: "#a3a3a3", marginTop: 8 },

  vereditoBox: {
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: CORES.dourado,
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  vereditoTexto: { fontSize: 11, fontWeight: 700, color: CORES.grenaEscuro },

  comentariosTexto: { fontSize: 9.5, color: "#1f1f1f", marginTop: 6, lineHeight: 1.4 },
});

function DadoItem({ label, valor }: { label: string; valor: string | null }) {
  return (
    <View style={styles.dadoItem}>
      <Text style={styles.dadoLabel}>{label}</Text>
      <Text style={styles.dadoValor}>{valor ?? "—"}</Text>
    </View>
  );
}

function NotaBox({ label, valor }: { label: string; valor: number | null }) {
  return (
    <View style={styles.notaBox}>
      <Text style={styles.notaLabel}>{label}</Text>
      <Text style={styles.notaValor}>{valor ?? "—"}</Text>
    </View>
  );
}

/** Rótulo do veredito impresso no documento — usa a MESMA nomenclatura do status da Captação
 * ("Aprovado"/"Dispensado", nunca "Reprovado"). Quando o candidato ainda está "Em avaliação" (o
 * Treinador ainda não preencheu o parecer), o PDF pode ser gerado mesmo assim — sai com "Em
 * avaliação" aqui, pra o Mateus poder conferir o layout antes do preenchimento. */
function veredicoLabel(status: string): string {
  if (status === "aprovado") return "Aprovado";
  if (status === "dispensado") return "Dispensado";
  if (status === "nao_compareceu") return "Não compareceu";
  return "Em avaliação (parecer ainda não preenchido)";
}

export interface ParecerFinalCandidato {
  nome: string;
  dataNascimento: string | null;
  categoria: string | null;
  posicao: string | null;
  cidade: string | null;
  uf: string | null;
  clubeAnterior: string | null;
  indicacao: string | null;
  notaTecnica: number | null;
  notaFisica: number | null;
  notaTatica: number | null;
  notaComportamental: number | null;
  status: string;
  comentarios: string | null;
  dataInicio: string | null;
  dataTermino: string | null;
}

export function ParecerFinalDocument({
  juventusLogoSrc,
  fotoSrc,
  candidato,
  assinaturas,
  emitidoEm,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  candidato: ParecerFinalCandidato;
  assinaturas: AssinaturaInfo[];
  emitidoEm: Date;
}) {
  const cidadeTexto =
    candidato.cidade && candidato.uf
      ? `${candidato.cidade}/${candidato.uf}`
      : candidato.cidade || candidato.uf || null;

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.headerRow}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
          <View style={styles.tituloBox}>
            <Text style={styles.tituloTexto}>Parecer Final de Avaliação</Text>
            <Text style={styles.subtituloTexto}>Futebol de Base · Emitido em {formatCarimbo(emitidoEm)}</Text>
          </View>
        </View>

        <View style={styles.candidatoRow}>
          {fotoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.foto} src={fotoSrc as string} />
          ) : (
            <View style={styles.fotoPlaceholder} />
          )}
          <Text style={styles.nomeCandidato}>{candidato.nome}</Text>
        </View>

        <Text style={styles.secaoTitulo}>Dados do candidato</Text>
        <View style={styles.dadosGrid}>
          <DadoItem label="Data de nascimento" valor={formatDataBr(candidato.dataNascimento)} />
          <DadoItem label="Categoria" valor={candidato.categoria} />
          <DadoItem label="Posição" valor={candidato.posicao} />
          <DadoItem label="Cidade" valor={cidadeTexto} />
          <DadoItem label="Clube anterior" valor={candidato.clubeAnterior} />
          <DadoItem label="Indicação" valor={candidato.indicacao} />
          <DadoItem label="Início da avaliação" valor={formatDataBr(candidato.dataInicio)} />
          <DadoItem label="Final da avaliação" valor={formatDataBr(candidato.dataTermino)} />
        </View>

        <Text style={styles.secaoTitulo}>Avaliação</Text>
        <View style={styles.notasRow}>
          <NotaBox label="Técnica" valor={candidato.notaTecnica} />
          <NotaBox label="Física" valor={candidato.notaFisica} />
          <NotaBox label="Tática" valor={candidato.notaTatica} />
          <NotaBox label="Comportamental" valor={candidato.notaComportamental} />
        </View>
        <Text style={styles.legenda}>Legenda: 3-4 Regular · 5-6 Bom · 7-8 Muito Bom · 9 Excelente</Text>

        <View style={styles.vereditoBox}>
          <Text style={styles.vereditoTexto}>Parecer final: {veredicoLabel(candidato.status)}</Text>
        </View>

        {candidato.comentarios ? (
          <>
            <Text style={styles.secaoTitulo}>Comentários finais</Text>
            <Text style={styles.comentariosTexto}>{candidato.comentarios}</Text>
          </>
        ) : null}

        <AssinaturasBlockDinamico assinaturas={assinaturas} />

        <DocumentoFooter geradoEm={emitidoEm} />
      </Page>
    </Document>
  );
}
