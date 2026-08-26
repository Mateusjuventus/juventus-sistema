import { Document, Page, Text, View, Image, StyleSheet, Svg, Line, Polygon } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, type LogoSrc } from "./logistica-shared";
import {
  ORDEM_POSICOES_CAMPOGRAMA,
  calcularPontoAngular,
  calcularPontosRadar,
  contarPorPosicaoCampograma,
  nomeCampograma,
  seloContratoAtleta,
  type AtletaCampograma,
  type GrupoCampograma,
} from "@/lib/futebol/campograma";
import { corHexAnelClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";

/**
 * PDF do Campograma — elenco de uma categoria numa folha só, no estilo do relatório de referência do
 * Corinthians (ver docs/superpowers/specs/2026-08-26-campograma-foto-classificacao-design.md): foto
 * com anel de classificação, selo de contrato P/F, nome e data de nascimento por atleta, agrupados
 * nas 9 posições específicas, gráfico de radar de posições, marca d'água do brasão e faixa lateral
 * grená com o monograma "J".
 *
 * Página única: pra elencos grandes, foto/nome/data encolhem proporcionalmente (`calcularEscala`)
 * pra caber tudo numa folha só sem quebrar pra uma segunda página. É um ajuste por heurística (não
 * uma garantia matemática pra qualquer tamanho de elenco) — verificação visual final é do Mateus,
 * mesmo padrão dos demais documentos do sistema (nenhum tem teste automatizado de layout de PDF).
 */

const FAIXA_LARGURA = 34;

// Tamanho de elenco "de referência", pensado pro layout padrão (foto 34×38pt) caber confortavelmente
// numa página A4 com as 9 linhas. Acima disso, encolhe proporcionalmente até um piso de legibilidade.
const TOTAL_REFERENCIA = 26;
const ESCALA_MINIMA = 0.6;

const FOTO_LARGURA_BASE = 34;
const FOTO_ALTURA_BASE = 38;
const JOGADOR_LARGURA_BASE = 40;
const NOME_FONTE_BASE = 6;
const NASC_FONTE_BASE = 5.5;
const SELO_TAMANHO_BASE = 11;
const SELO_FONTE_BASE = 5.5;
const BORDA_ANEL_BASE = 2.25;

function calcularEscala(totalAtletas: number): number {
  if (totalAtletas <= TOTAL_REFERENCIA) return 1;
  return Math.max(ESCALA_MINIMA, TOTAL_REFERENCIA / totalAtletas);
}

const RADAR_TAMANHO = 148;
const RADAR_CENTRO = { x: 74, y: 74 };
const RADAR_RAIO = 48;
const RADAR_RAIO_ROTULO = 64;
const RADAR_ANEIS = [0.35, 0.65, 1];
const RADAR_ROTULO_LARGURA = 72;

function anchorRotulo(x: number, centroX: number): "start" | "middle" | "end" {
  if (x > centroX + 4) return "start";
  if (x < centroX - 4) return "end";
  return "middle";
}

const styles = StyleSheet.create({
  page: { flexDirection: "row", fontFamily: "Helvetica", fontSize: 10, color: "#262626" },
  faixaLateral: {
    width: FAIXA_LARGURA,
    backgroundColor: CORES.grenaEscuro,
    alignItems: "center",
    justifyContent: "center",
  },
  faixaLetra: { fontFamily: "Times-Bold", fontSize: 52, color: "rgba(255,255,255,0.22)" },
  conteudo: { flex: 1, padding: 32, paddingBottom: 60, position: "relative" },
  watermark: { position: "absolute", opacity: 0.045 },
  topo: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  topoLogo: { width: 28, height: 28, objectFit: "contain" },
  topoTitulo: { fontSize: 15, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase", letterSpacing: 0.3 },
  topoData: { fontSize: 8, color: "#a3a3a3", marginTop: 1 },
  linha: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
  },
  linhaLabelWrap: { width: 66, paddingTop: 3 },
  linhaLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: "#525252",
    textTransform: "uppercase",
  },
  linhaLabelContagem: { fontSize: 6.5, fontWeight: 700, color: "#a3a3a3", marginTop: 1 },
  linhaVazia: { fontSize: 7.5, color: "#d4d4d4", paddingTop: 3 },
  jogadoresWrap: { flexDirection: "row", flexWrap: "wrap", flex: 1, rowGap: 4, columnGap: 6 },
  jogador: { alignItems: "center" },
  fotoWrap: { borderRadius: 3, overflow: "hidden", backgroundColor: "#f5f5f5", position: "relative" },
  fotoPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  fotoPlaceholderTexto: { fontWeight: 700, color: "#a3a3a3" },
  selo: {
    position: "absolute",
    top: -3,
    right: -3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  seloTexto: { fontWeight: 700, color: "#ffffff" },
  nome: { fontWeight: 700, color: "#262626", textAlign: "center", marginTop: 2 },
  nascimento: { color: "#a3a3a3", textAlign: "center" },
  legenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
  },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendaTexto: { fontSize: 7, color: "#737373" },
  legendaSwatch: { width: 7, height: 7, borderRadius: 2, borderWidth: 1.5 },
  legendaSelo: { width: 9, height: 9, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  legendaSeloTexto: { fontSize: 5.5, fontWeight: 700, color: "#ffffff" },
  graficoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 10 },
  radarLabel: { position: "absolute", fontSize: 6.5, fontWeight: 700, color: "#525252" },
  totalBox: { alignItems: "center" },
  totalNumero: { fontSize: 22, fontWeight: 700, color: CORES.grenaEscuro },
  totalLabel: { fontSize: 7, color: "#a3a3a3", textTransform: "uppercase" },
});

function LegendaItem({ swatchCor, texto }: { swatchCor: string; texto: string }) {
  return (
    <View style={styles.legendaItem}>
      <View style={[styles.legendaSwatch, { borderColor: swatchCor }]} />
      <Text style={styles.legendaTexto}>{texto}</Text>
    </View>
  );
}

function LegendaSelo({ letra, cor, texto }: { letra: string; cor: string; texto: string }) {
  return (
    <View style={styles.legendaItem}>
      <View style={[styles.legendaSelo, { backgroundColor: cor }]}>
        <Text style={styles.legendaSeloTexto}>{letra}</Text>
      </View>
      <Text style={styles.legendaTexto}>{texto}</Text>
    </View>
  );
}

function GraficoPosicoesPdf({ grupos }: { grupos: GrupoCampograma }) {
  const contagens = contarPorPosicaoCampograma(grupos);
  const total = contagens.reduce((soma, c) => soma + c.quantidade, 0);
  const pontosDados = calcularPontosRadar(contagens, RADAR_CENTRO, RADAR_RAIO);

  return (
    <View style={styles.graficoRow} wrap={false}>
      {/* A View é mais larga que o próprio desenho (RADAR_TAMANHO) pra sobrar espaço pros rótulos
          dos eixos, que se estendem além da borda do gráfico (ver RADAR_RAIO_ROTULO) — sem essa
          folga, o texto dos rótulos do lado direito invadia a caixa do total ao lado. */}
      <View style={{ position: "relative", width: RADAR_TAMANHO + RADAR_ROTULO_LARGURA, height: RADAR_TAMANHO }}>
        <Svg width={RADAR_TAMANHO} height={RADAR_TAMANHO}>
          {RADAR_ANEIS.map((fator) => {
            const pontosAnel = contagens
              .map((_, i) => calcularPontoAngular(i, contagens.length, RADAR_CENTRO, RADAR_RAIO * fator))
              .map((p) => `${p.x},${p.y}`)
              .join(" ");
            return <Polygon key={fator} points={pontosAnel} fill="none" stroke="#e5e5e5" strokeWidth={0.75} />;
          })}
          {contagens.map((c, i) => {
            const ponta = calcularPontoAngular(i, contagens.length, RADAR_CENTRO, RADAR_RAIO);
            return (
              <Line
                key={c.posicao}
                x1={RADAR_CENTRO.x}
                y1={RADAR_CENTRO.y}
                x2={ponta.x}
                y2={ponta.y}
                stroke="#d4d4d4"
                strokeWidth={0.75}
              />
            );
          })}
          <Polygon
            points={pontosDados.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={CORES.grena}
            fillOpacity={0.25}
            stroke={CORES.grena}
            strokeWidth={1.25}
          />
        </Svg>
        {contagens.map((c, i) => {
          const rotulo = calcularPontoAngular(i, contagens.length, RADAR_CENTRO, RADAR_RAIO_ROTULO);
          const anchor = anchorRotulo(rotulo.x, RADAR_CENTRO.x);
          const left =
            anchor === "start" ? rotulo.x : anchor === "end" ? rotulo.x - RADAR_ROTULO_LARGURA : rotulo.x - RADAR_ROTULO_LARGURA / 2;
          return (
            <Text
              key={c.posicao}
              style={[
                styles.radarLabel,
                {
                  left,
                  top: rotulo.y - 4,
                  width: RADAR_ROTULO_LARGURA,
                  textAlign: anchor === "start" ? "left" : anchor === "end" ? "right" : "center",
                },
              ]}
            >
              {c.posicao} ({c.quantidade})
            </Text>
          );
        })}
      </View>
      <View style={styles.totalBox}>
        <Text style={styles.totalNumero}>{total}</Text>
        <Text style={styles.totalLabel}>{total === 1 ? "Atleta no elenco" : "Atletas no elenco"}</Text>
      </View>
    </View>
  );
}

function TokenAtletaPdf({ atleta, escala }: { atleta: AtletaCampograma; escala: number }) {
  const selo = seloContratoAtleta(atleta.tipoContrato);
  const corAnel = corHexAnelClassificacaoAtleta(atleta.classificacao);
  const nascimento = formatDataBr(atleta.dataNascimento);
  const nome = nomeCampograma(atleta);

  const fotoLargura = FOTO_LARGURA_BASE * escala;
  const fotoAltura = FOTO_ALTURA_BASE * escala;
  const seloTamanho = SELO_TAMANHO_BASE * escala;

  return (
    <View style={[styles.jogador, { width: JOGADOR_LARGURA_BASE * escala }]}>
      <View
        style={[
          styles.fotoWrap,
          { width: fotoLargura, height: fotoAltura, borderWidth: BORDA_ANEL_BASE * escala, borderColor: corAnel },
        ]}
      >
        {atleta.fotoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={{ width: "100%", height: "100%", objectFit: "cover" }} src={atleta.fotoUrl} />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Text style={[styles.fotoPlaceholderTexto, { fontSize: 13 * escala }]}>{nome.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {selo ? (
          <View
            style={[
              styles.selo,
              { width: seloTamanho, height: seloTamanho, backgroundColor: selo === "P" ? "#171717" : "#dc2626" },
            ]}
          >
            <Text style={[styles.seloTexto, { fontSize: SELO_FONTE_BASE * escala }]}>{selo}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.nome, { fontSize: NOME_FONTE_BASE * escala }]}>{nome}</Text>
      {nascimento !== "—" ? (
        <Text style={[styles.nascimento, { fontSize: NASC_FONTE_BASE * escala }]}>{nascimento}</Text>
      ) : null}
    </View>
  );
}

export function CampogramaDocument({
  juventusLogoSrc,
  juventusWatermarkSrc,
  categoriaLabel,
  geradoEm,
  grupos,
}: {
  juventusLogoSrc: LogoSrc;
  juventusWatermarkSrc: LogoSrc;
  categoriaLabel: string;
  geradoEm: Date;
  grupos: GrupoCampograma;
}) {
  const totalAtletas = ORDEM_POSICOES_CAMPOGRAMA.reduce((soma, p) => soma + grupos[p].length, 0);
  const escala = calcularEscala(totalAtletas);
  const dataTexto = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(geradoEm);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.faixaLateral} fixed>
          <Text style={styles.faixaLetra}>J</Text>
        </View>

        <View style={styles.conteudo}>
          {juventusWatermarkSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image
              style={[styles.watermark, { top: 220, left: 88, width: 380, height: 380 }]}
              src={juventusWatermarkSrc as string}
              fixed
            />
          ) : null}

          <View style={styles.topo}>
            {juventusLogoSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.topoLogo} src={juventusLogoSrc as string} />
            ) : null}
            <View>
              <Text style={styles.topoTitulo}>Elenco — {categoriaLabel}</Text>
              <Text style={styles.topoData}>{dataTexto}</Text>
            </View>
          </View>

          {ORDEM_POSICOES_CAMPOGRAMA.map((posicao) => {
            const atletasDaLinha = grupos[posicao];
            return (
              <View key={posicao} style={styles.linha} wrap={false}>
                <View style={styles.linhaLabelWrap}>
                  <Text style={styles.linhaLabel}>{posicao}</Text>
                  <Text style={styles.linhaLabelContagem}>{atletasDaLinha.length}</Text>
                </View>
                {atletasDaLinha.length === 0 ? (
                  <Text style={styles.linhaVazia}>Ninguém cadastrado</Text>
                ) : (
                  <View style={styles.jogadoresWrap}>
                    {atletasDaLinha.map((atleta) => (
                      <TokenAtletaPdf key={atleta.id} atleta={atleta} escala={escala} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {grupos.sem_posicao.length > 0 ? (
            <View style={styles.linha} wrap={false}>
              <View style={styles.linhaLabelWrap}>
                <Text style={styles.linhaLabel}>Sem posição</Text>
                <Text style={styles.linhaLabelContagem}>{grupos.sem_posicao.length}</Text>
              </View>
              <Text style={{ fontSize: 7, color: "#a3a3a3", paddingTop: 4, flex: 1 }}>
                {grupos.sem_posicao.map((a) => nomeCampograma(a)).join(", ")}
              </Text>
            </View>
          ) : null}

          <View style={styles.legenda} wrap={false}>
            <LegendaItem swatchCor="#22c55e" texto="G1" />
            <LegendaItem swatchCor="#facc15" texto="G2" />
            <LegendaItem swatchCor="#f97316" texto="G3" />
            <LegendaItem swatchCor="#d4d4d4" texto="Não classificado" />
            <LegendaSelo letra="P" cor="#171717" texto="Definitivo/Empréstimo" />
            <LegendaSelo letra="F" cor="#dc2626" texto="Amador/Iniciação" />
          </View>

          <GraficoPosicoesPdf grupos={grupos} />

          <DocumentoFooter geradoEm={geradoEm} />
        </View>
      </Page>
    </Document>
  );
}
