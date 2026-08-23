import { Document, Page, Text, View, Image, StyleSheet, Svg, Line } from "@react-pdf/renderer";
import {
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
  type LogoSrc,
} from "./logistica-shared";
import {
  ALTURA_CABECALHO_GRUPO,
  ALTURA_CAIXA,
  LARGURA_CAIXA,
  calcularLayoutAutomatico,
  type OrganogramaNo,
} from "@/lib/futebol/organograma";

/**
 * PDF do Organograma da Base (`/base/comissao-tecnica/organograma`) — mesmo diagrama da tela
 * (conectores em ângulo reto, cabeçalho de coluna por `grupo`, rótulo de linha por `linha`, ver
 * `components/organograma-editor.tsx`), redesenhado em `@react-pdf/renderer` porque a tela usa
 * HTML/CSS absoluto que o react-pdf não interpreta. A posição de cada caixa é a MESMA da tela: usa
 * `pos_x`/`pos_y` salvos (quem já foi arrastada) ou o layout automático (`calcularLayoutAutomatico`)
 * pra quem não foi — nunca diverge do que o Mateus está vendo na tela.
 */

export interface OrganogramaBaseNoDocumento {
  id: string;
  nomeExibido: string;
  cargoExibido: string;
  grupo: string | null;
  linha: string | null;
  reportaPara: string | null;
  ordem: number;
  posX: number | null;
  posY: number | null;
}

const LARGURA_ROTULO_LINHA = 140;
const GAP_ROTULO_LINHA = 12;
const DIAGRAMA_PADDING = 24;
// A4 paisagem = 842×595pt. Descontando as margens da página (32pt) e o cabeçalho/rodapé, sobra
// essa área útil pro diagrama — ele encolhe (nunca amplia) pra caber nela.
const LARGURA_PAGINA_UTIL = 760;
const ALTURA_PAGINA_UTIL = 385;

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 60, fontFamily: "Helvetica", color: "#262626" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  headerLogo: { width: 30, height: 35, objectFit: "contain", marginRight: 10 },
  titulo: {
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  diagramaWrap: { alignItems: "center" },
  caixa: {
    position: "absolute",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: "center",
    overflow: "hidden",
  },
  caixaLideranca: { backgroundColor: CORES.grena },
  caixaMembro: { backgroundColor: "#ffffff", borderWidth: 0.75, borderColor: "#d4d4d4" },
  caixaNome: { fontSize: 6.5, fontWeight: 700 },
  caixaCargo: { fontSize: 5.5, marginTop: 1 },
  cabecalhoGrupo: {
    position: "absolute",
    backgroundColor: CORES.grena,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    overflow: "hidden",
  },
  cabecalhoGrupoTexto: {
    fontSize: 6,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  rotuloLinha: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderWidth: 0.75,
    borderColor: "#c9b3bf",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    overflow: "hidden",
  },
  rotuloLinhaTexto: {
    fontSize: 6,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});

interface Ponto {
  x: number;
  y: number;
}

/** Mesmos 4 cálculos do `OrganogramaEditor` (posição de cada caixa, cabeçalho de grupo, rótulo de
 * linha, conectores em ângulo reto) — só sem os overrides de arrasto (o PDF é uma foto do que está
 * salvo, não tem interação). */
function calcularDiagrama(nos: OrganogramaBaseNoDocumento[]) {
  const layoutAutomatico = calcularLayoutAutomatico(
    nos.map(
      (n): OrganogramaNo => ({ id: n.id, reportaPara: n.reportaPara, grupo: n.grupo, linha: n.linha, ordem: n.ordem }),
    ),
  );
  const posicoes = new Map<string, Ponto>();
  for (const no of nos) {
    // Célula de grade (Grupo E Linha) sempre usa a posição calculada — mesma regra da tela (ver
    // `components/organograma-editor.tsx`), pra nunca sair do alinhamento mesmo que ainda tenha uma
    // posição arrastada salva de antes dessa regra existir.
    if (no.grupo && no.linha) posicoes.set(no.id, layoutAutomatico.get(no.id) ?? { x: 0, y: 0 });
    else if (no.posX !== null && no.posY !== null) posicoes.set(no.id, { x: no.posX, y: no.posY });
    else posicoes.set(no.id, layoutAutomatico.get(no.id) ?? { x: 0, y: 0 });
  }

  const porGrupo = new Map<string, Ponto[]>();
  for (const no of nos) {
    if (!no.grupo) continue;
    const pos = posicoes.get(no.id);
    if (!pos) continue;
    porGrupo.set(no.grupo, [...(porGrupo.get(no.grupo) ?? []), pos]);
  }
  const cabecalhosGrupo = [...porGrupo.entries()].map(([grupo, pontos]) => {
    const topo = pontos.reduce((a, b) => (b.y < a.y ? b : a));
    return { grupo, x: topo.x, y: topo.y - ALTURA_CABECALHO_GRUPO - 12 };
  });

  const porLinha = new Map<string, Ponto[]>();
  for (const no of nos) {
    if (!no.grupo || !no.linha) continue;
    const pos = posicoes.get(no.id);
    if (!pos) continue;
    porLinha.set(no.linha, [...(porLinha.get(no.linha) ?? []), pos]);
  }
  let rotulosLinha: { linha: string; x: number; y: number }[] = [];
  if (porLinha.size > 0) {
    const minXColunas = Math.min(...[...porLinha.values()].flat().map((p) => p.x));
    rotulosLinha = [...porLinha.entries()].map(([linha, pontos]) => {
      const y = pontos.reduce((soma, p) => soma + p.y, 0) / pontos.length;
      return { linha, x: minXColunas - LARGURA_ROTULO_LINHA - GAP_ROTULO_LINHA, y };
    });
  }

  const porPai = new Map<string, Ponto[]>();
  for (const no of nos) {
    if (!no.reportaPara) continue;
    const pos = posicoes.get(no.id);
    if (!pos) continue;
    porPai.set(no.reportaPara, [...(porPai.get(no.reportaPara) ?? []), pos]);
  }
  const conectores: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const [paiId, filhos] of porPai) {
    const pai = posicoes.get(paiId);
    if (!pai || filhos.length === 0) continue;
    const paiCentroX = pai.x + LARGURA_CAIXA / 2;
    const paiBaixoY = pai.y + ALTURA_CAIXA;
    const filhosCentroX = filhos.map((f) => f.x + LARGURA_CAIXA / 2);
    const menorTopoFilho = Math.min(...filhos.map((f) => f.y));
    const busY = paiBaixoY + Math.max(16, (menorTopoFilho - paiBaixoY) / 2);
    conectores.push({ x1: paiCentroX, y1: paiBaixoY, x2: paiCentroX, y2: busY });
    const minX = Math.min(paiCentroX, ...filhosCentroX);
    const maxX = Math.max(paiCentroX, ...filhosCentroX);
    if (maxX > minX) conectores.push({ x1: minX, y1: busY, x2: maxX, y2: busY });
    filhos.forEach((f, i) => {
      conectores.push({ x1: filhosCentroX[i], y1: busY, x2: filhosCentroX[i], y2: f.y });
    });
  }

  const todasAsPosicoes = [
    ...[...posicoes.values()],
    ...cabecalhosGrupo.map((c) => ({ x: c.x, y: c.y })),
    ...rotulosLinha.map((r) => ({ x: r.x, y: r.y })),
  ];
  // Diferente da tela (que ancora em x=0/y=0 pra dar um referencial estável pro arrasto), o PDF não
  // tem arrasto — o retângulo precisa envolver só o conteúdo de verdade, sem sobra de espaço vazio
  // de um lado. Incluir 0 à força (como a tela faz) deixava o diagrama fora do centro da página
  // quando o conteúdo real não passava perto da origem.
  const minX = Math.min(...todasAsPosicoes.map((p) => p.x));
  const minY = Math.min(...todasAsPosicoes.map((p) => p.y));
  const maxX = Math.max(...todasAsPosicoes.map((p) => p.x + LARGURA_CAIXA));
  const maxY = Math.max(...todasAsPosicoes.map((p) => p.y + ALTURA_CAIXA));

  return { posicoes, cabecalhosGrupo, rotulosLinha, conectores, minX, minY, maxX, maxY };
}

export function OrganogramaBaseDocument({
  juventusLogoSrc,
  geradoEm,
  nos,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  nos: OrganogramaBaseNoDocumento[];
}) {
  const diagrama = calcularDiagrama(nos);
  const larguraConteudo = diagrama.maxX - diagrama.minX + DIAGRAMA_PADDING * 2;
  const alturaConteudo = diagrama.maxY - diagrama.minY + DIAGRAMA_PADDING * 2;
  // Encolhe pra caber na página — nunca amplia (um organograma pequeno não deve virar gigante).
  const escala = Math.min(1, LARGURA_PAGINA_UTIL / larguraConteudo, ALTURA_PAGINA_UTIL / alturaConteudo);
  const deslocX = -diagrama.minX + DIAGRAMA_PADDING;
  const deslocY = -diagrama.minY + DIAGRAMA_PADDING;

  function pt(pos: Ponto) {
    return { x: (pos.x + deslocX) * escala, y: (pos.y + deslocY) * escala };
  }

  const larguraFinal = larguraConteudo * escala;
  const alturaFinal = alturaConteudo * escala;
  const larguraCaixaPdf = LARGURA_CAIXA * escala;
  const alturaCaixaPdf = ALTURA_CAIXA * escala;
  const alturaCabecalhoPdf = ALTURA_CABECALHO_GRUPO * escala;
  const larguraRotuloPdf = LARGURA_ROTULO_LINHA * escala;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
          ) : null}
          <Text style={styles.titulo}>Organograma (Funções)</Text>
        </View>
        <DepartamentoEyebrow departamento="base" />
        <Text style={styles.subtitulo}>Estrutura do Departamento de Futebol de Base</Text>

        <View style={styles.diagramaWrap}>
          <View style={{ position: "relative", width: larguraFinal, height: alturaFinal }}>
            <Svg width={larguraFinal} height={alturaFinal} style={{ position: "absolute", top: 0, left: 0 }}>
              {diagrama.conectores.map((s, i) => {
                const de = pt({ x: s.x1, y: s.y1 });
                const para = pt({ x: s.x2, y: s.y2 });
                return <Line key={i} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke={CORES.dourado} strokeWidth={1} />;
              })}
            </Svg>

            {diagrama.cabecalhosGrupo.map((c) => {
              const p = pt(c);
              return (
                <View
                  key={c.grupo}
                  style={[styles.cabecalhoGrupo, { left: p.x, top: p.y, width: larguraCaixaPdf, height: alturaCabecalhoPdf }]}
                >
                  <Text style={styles.cabecalhoGrupoTexto}>{c.grupo}</Text>
                </View>
              );
            })}

            {diagrama.rotulosLinha.map((r) => {
              const p = pt(r);
              return (
                <View
                  key={r.linha}
                  style={[styles.rotuloLinha, { left: p.x, top: p.y, width: larguraRotuloPdf, height: alturaCaixaPdf }]}
                >
                  <Text style={styles.rotuloLinhaTexto}>{r.linha}</Text>
                </View>
              );
            })}

            {nos.map((no) => {
              const pos = diagrama.posicoes.get(no.id);
              if (!pos) return null;
              const p = pt(pos);
              const lideranca = !no.grupo;
              return (
                <View
                  key={no.id}
                  style={[
                    styles.caixa,
                    lideranca ? styles.caixaLideranca : styles.caixaMembro,
                    { left: p.x, top: p.y, width: larguraCaixaPdf, height: alturaCaixaPdf },
                  ]}
                >
                  <Text style={[styles.caixaNome, { color: lideranca ? "#ffffff" : CORES.grenaEscuro }]}>
                    {no.nomeExibido}
                  </Text>
                  {no.cargoExibido ? (
                    <Text style={[styles.caixaCargo, { color: lideranca ? "#ffffffcc" : "#737373" }]}>
                      {no.cargoExibido}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
