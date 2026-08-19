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
 * Parecer Final de Avaliação da Captação/Avaliação — layout fiel ao modelo do Corinthians enviado
 * pelo Mateus (grade de campos em caixas com rótulo + valor, notas em caixas, aprovado/reprovado
 * como checkbox, assinaturas em duas fileiras), com a marca do Juventus. Ver docs/superpowers/
 * specs/2026-08-19-parecer-final-treinador-design.md. Reaproveita `logistica-shared.tsx` (cores,
 * rodapé, bloco de assinaturas) do mesmo jeito que os outros documentos oficiais.
 *
 * Duas diferenças deliberadas em relação ao modelo original, já decididas na spec:
 * - "Apelido" fica de fora (não existe em `captacao_base`, não foi pedido) — a caixa "Nome do
 *   jogador" ocupa a linha inteira sozinha em vez de dividir com Apelido.
 * - O checkbox de veredito é só "Aprovado"/"Dispensado" — nunca "Reprovado" (mesma nomenclatura do
 *   status da Captação em todo o resto do sistema). "Não compareceu" fica de fora do checkbox por
 *   pedido explícito: não é uma decisão do parecer do Treinador, é algo que só o Mateus marca à
 *   parte (ver a spec).
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

  // Grade de campos "em caixa": tira cinza com o rótulo em cima, valor centralizado embaixo — o
  // mesmo padrão do modelo original, reaproveitado em toda a ficha (identidade, notas, legenda).
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

  // Notas: rótulo à esquerda em negrito, valor à direita — uma linha só dentro da caixa, igual ao
  // modelo (em vez do rótulo-em-cima das caixas de identidade).
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

  vereditoLinha: { flexDirection: "row", marginTop: 12, gap: 22 },
  vereditoColEsquerda: { width: 150 },
  vereditoOpcaoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  vereditoCheckbox: {
    width: 13,
    height: 13,
    borderWidth: 0.75,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  vereditoCheckboxMarca: { fontSize: 9, fontWeight: 700, color: CORES.grenaEscuro },
  vereditoOpcaoTexto: { fontSize: 9, fontWeight: 700, color: "#1a1a1a", textTransform: "uppercase" },

  dataBox: { borderWidth: 0.75, borderColor: "#1a1a1a", marginTop: 10 },
  dataBoxRotulo: {
    backgroundColor: CORES.grena,
    borderBottomWidth: 0.75,
    borderBottomColor: "#1a1a1a",
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dataBoxValor: { paddingVertical: 6, paddingHorizontal: 6, fontSize: 9, color: "#1a1a1a" },

  comentariosColuna: { flex: 1 },
  comentariosLabel: { fontSize: 8.5, fontWeight: 700, color: "#1a1a1a", textTransform: "uppercase" },
  comentariosTexto: { fontSize: 9, color: "#1a1a1a", marginTop: 8, lineHeight: 1.5 },
  comentariosVazio: { fontSize: 8.5, color: "#a3a3a3", marginTop: 8, fontStyle: "italic" },
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

const OPCOES_VEREDITO = [
  { valor: "aprovado", label: "Aprovado" },
  { valor: "dispensado", label: "Dispensado" },
] as const;

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
          {fotoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.foto} src={fotoSrc as string} />
          ) : (
            <View style={styles.fotoPlaceholder} />
          )}
          <View style={styles.tituloBox}>
            <Text style={styles.tituloTexto}>Parecer Final</Text>
            <Text style={styles.subtituloTexto}>Avaliação</Text>
            <Text style={styles.subtituloTextoSub}>Departamento das Categorias de Base</Text>
          </View>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={juventusLogoSrc as string} />
          ) : null}
        </View>

        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Nome do jogador" valor={candidato.nome} ultima />
        </View>
        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Data de nascimento" valor={formatDataBr(candidato.dataNascimento)} />
          <CaixaCampo label="Categoria" valor={candidato.categoria} />
          <CaixaCampo label="Posição" valor={candidato.posicao} ultima />
        </View>
        <View style={styles.linhaCaixas}>
          <CaixaCampo label="Clube anterior" valor={candidato.clubeAnterior} />
          <CaixaCampo label="Cidade atual" valor={cidadeTexto} />
          <CaixaCampo label="Indicação" valor={candidato.indicacao} ultima />
        </View>

        <View style={styles.legendaBox}>
          <Text style={styles.caixaRotulo}>Legenda notas avaliativas</Text>
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
          <NotaCaixa label="Técnica" valor={candidato.notaTecnica} />
          <NotaCaixa label="Física" valor={candidato.notaFisica} ultima />
        </View>
        <View style={[styles.linhaCaixas, { marginTop: -0.75 }]}>
          <NotaCaixa label="Tática" valor={candidato.notaTatica} />
          <NotaCaixa label="Comportamental" valor={candidato.notaComportamental} ultima />
        </View>

        <Text style={styles.secaoTitulo}>Parecer Final</Text>
        <View style={styles.vereditoLinha} wrap={false}>
          <View style={styles.vereditoColEsquerda}>
            {OPCOES_VEREDITO.map((opcao) => (
              <View style={styles.vereditoOpcaoRow} key={opcao.valor}>
                <View style={styles.vereditoCheckbox}>
                  {candidato.status === opcao.valor ? (
                    <Text style={styles.vereditoCheckboxMarca}>X</Text>
                  ) : null}
                </View>
                <Text style={styles.vereditoOpcaoTexto}>{opcao.label}</Text>
              </View>
            ))}

            <View style={styles.dataBox}>
              <Text style={styles.dataBoxRotulo}>Início da avaliação</Text>
              <Text style={styles.dataBoxValor}>{formatDataBr(candidato.dataInicio)}</Text>
            </View>
            <View style={[styles.dataBox, { marginTop: 8 }]}>
              <Text style={styles.dataBoxRotulo}>Final da avaliação</Text>
              <Text style={styles.dataBoxValor}>{formatDataBr(candidato.dataTermino)}</Text>
            </View>
          </View>

          <View style={styles.comentariosColuna}>
            <Text style={styles.comentariosLabel}>Comentários finais</Text>
            {candidato.comentarios ? (
              <Text style={styles.comentariosTexto}>{candidato.comentarios}</Text>
            ) : (
              <Text style={styles.comentariosVazio}>Ainda não preenchido.</Text>
            )}
          </View>
        </View>

        <AssinaturasBlockDinamico assinaturas={assinaturas} />

        <Text style={{ fontSize: 7, color: "#a3a3a3", textAlign: "center", marginTop: 10 }}>
          Emitido em {formatCarimbo(emitidoEm)}
        </Text>

        <DocumentoFooter geradoEm={emitidoEm} />
      </Page>
    </Document>
  );
}
