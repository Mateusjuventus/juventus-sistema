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
  calcularConectores,
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
  posManual: boolean;
}

const LARGURA_ROTULO_LINHA = 140;
const GAP_ROTULO_LINHA = 12;
const DIAGRAMA_PADDING = 24;
// A4 paisagem = 841.89×595.28pt. Descontando as margens da página e o cabeçalho/rodapé, sobra essa
// área útil pro diagrama numa folha A4 comum.
const A4_LARGURA = 841.89;
const A4_ALTURA = 595.28;
const LARGURA_PAGINA_UTIL_A4 = 770;
const ALTURA_PAGINA_UTIL_A4 = 400;
// Sobra fixa de cada lado (margem + cabeçalho/rodapé), reaproveitada pra calcular o tamanho da
// página quando ela precisa crescer além do A4 (ver `ESCALA_MINIMA_PDF` abaixo).
const MARGEM_HORIZONTAL = A4_LARGURA - LARGURA_PAGINA_UTIL_A4;
const MARGEM_VERTICAL = A4_ALTURA - ALTURA_PAGINA_UTIL_A4;
// Piso de escala do diagrama inteiro (caixa E letra encolhem sempre juntas, nunca só uma das duas —
// ver "Atualização 27/08" na spec: um piso só na FONTE, com a caixa continuando a encolher sozinha,
// fazia o texto ficar cortado bem curto demais ("Claudio R…") porque a caixa ficava bem menor do
// que a letra precisava, mesmo a letra estando no tamanho mínimo). Escolhido levemente acima da
// pior razão FONTE_MIN/FONTE_BASE (9/11 ≈ 0.82) pra sobrar uma margem confortável de caracteres.
// Organogramas pequenos continuam cabendo numa folha A4 normal (encolhem até esse piso, ou nem
// precisam encolher); organogramas grandes o bastante pra precisar de mais que isso fazem a folha
// crescer (ver `larguraPagina`/`alturaPagina`) em vez de continuar cortando texto pra caber numa
// folha pequena demais — do jeito que uma pessoa desenhando isso à mão usaria uma folha maior.
const ESCALA_MINIMA_PDF = 0.85;

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
    textAlign: "center",
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
  // Tamanho de fonte NÃO fica aqui — precisa encolher junto com `escala` (ver `FONTE_*_BASE` abaixo
  // e a spec de 27/08: era um bug real o texto ficar em tamanho fixo enquanto a caixa encolhia,
  // fazendo a letra vazar e sobrepor em organogramas largos).
  caixaNome: { fontWeight: 700 },
  caixaCargo: { marginTop: 1 },
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
    fontWeight: 700,
    color: CORES.grenaEscuro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});

// Tamanhos de fonte de referência (pt, escala 1). Como `ESCALA_MINIMA_PDF` acima já garante que a
// escala do diagrama INTEIRO (caixa + letra, sempre juntas) nunca fica abaixo de 0.85, esses `_MIN`
// na prática funcionam só como rede de segurança (nunca deveriam disparar sozinhos) — mantidos por
// segurança caso `ESCALA_MINIMA_PDF` mude no futuro. Um aumento só no valor de referência (27/08,
// primeira tentativa) não resolveu sozinho — em organogramas com bastante gente a escala ficava
// pequena o bastante pra que qualquer valor de referência razoável ainda virasse letra minúscula
// multiplicada por ela; só um piso de ESCALA (não só de fonte) resolve de verdade, porque um piso
// só na fonte, com a caixa continuando a encolher sozinha, cortava o texto bem curto demais mesmo
// a letra estando no tamanho "mínimo" (a caixa ficava menor do que a letra precisava). `overflow:
// "hidden"` em `styles.caixa` continua como rede de segurança pra um nome excepcionalmente comprido
// mesmo num organograma pequeno (escala 1): só corta o texto dentro da própria caixa, nunca vaza
// por cima de outra.
const FONTE_NOME_BASE = 11;
const FONTE_NOME_MIN = 9;
const FONTE_CARGO_BASE = 9;
const FONTE_CARGO_MIN = 7.5;
const FONTE_CABECALHO_BASE = 9;
const FONTE_CABECALHO_MIN = 7.5;
const FONTE_ROTULO_BASE = 9;
const FONTE_ROTULO_MIN = 7.5;

// Espelham o `paddingHorizontal` de `styles.caixa`/`styles.cabecalhoGrupo`/`styles.rotuloLinha`
// acima — usados só pra calcular a largura disponível pro texto em `truncarParaCaber`.
const PADDING_HORIZONTAL_CAIXA = 6;
const PADDING_HORIZONTAL_ROTULO = 3;

// Largura média de um caractere como fração do tamanho da fonte, usada por `truncarParaCaber` —
// nome (negrito, minúsculas/maiúsculas misturadas), cargo (normal) e cabeçalho/rótulo (negrito,
// CAIXA ALTA + letterSpacing, por isso mais largo que o nome).
const FATOR_LARGURA_NOME = 0.58;
const FATOR_LARGURA_CARGO = 0.5;
const FATOR_LARGURA_CAIXA_ALTA = 0.68;

interface Ponto {
  x: number;
  y: number;
}

/**
 * Corta o texto (com "…" no fim) pra caber numa linha só dentro de `larguraDisponivel`, usando uma
 * largura média de caractere estimada (não temos como medir a largura real do texto renderizado sem
 * rodar o PDF — react-pdf não tem um `text-overflow: ellipsis` embutido nem mede texto antes de
 * desenhar). Necessário desde que o piso de tamanho de fonte (`FONTE_*_MIN`) passou a existir: sem
 * cortar, um nome comprido podia quebrar em duas linhas dentro da caixa — como a caixa só reserva
 * espaço pra UMA linha de nome + uma de cargo, a segunda linha do nome acabava desenhada em cima do
 * cargo (bug visto no teste visual de 27/08). `fatorLargura` é a largura média de um caractere como
 * fração do tamanho da fonte (maior para negrito/caixa alta, que são mais largos).
 */
function truncarParaCaber(
  texto: string,
  larguraDisponivel: number,
  fontSize: number,
  fatorLargura: number,
): string {
  const larguraEstimada = texto.length * fontSize * fatorLargura;
  if (larguraEstimada <= larguraDisponivel) return texto;
  const caracteresQueCabem = Math.max(1, Math.floor(larguraDisponivel / (fontSize * fatorLargura)) - 1);
  return texto.slice(0, caracteresQueCabem).trimEnd() + "…";
}

/** Mesmos 4 cálculos do `OrganogramaEditor` (posição de cada caixa, cabeçalho de grupo, rótulo de
 * linha, conectores em ângulo reto) — só sem os overrides de arrasto (o PDF é uma foto do que está
 * salvo, não tem interação). */
function calcularDiagrama(nos: OrganogramaBaseNoDocumento[]) {
  const layoutAutomatico = calcularLayoutAutomatico(
    nos.map(
      (n): OrganogramaNo => ({
        id: n.id,
        reportaPara: n.reportaPara,
        grupo: n.grupo,
        linha: n.linha,
        ordem: n.ordem,
        automatico: Boolean(n.grupo && n.linha) || !n.posManual,
      }),
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

  // Mesmo cálculo de conectores da tela (`components/organograma-editor.tsx`), via
  // `calcularConectores` — garante que tela e PDF nunca divirjam (ver spec de 27/08).
  const conectores = calcularConectores(
    nos.map((n): OrganogramaNo => ({ id: n.id, reportaPara: n.reportaPara, grupo: n.grupo, linha: n.linha, ordem: n.ordem })),
    posicoes,
  );

  const todasAsPosicoes = [
    ...[...posicoes.values()],
    ...cabecalhosGrupo.map((c) => ({ x: c.x, y: c.y })),
    ...rotulosLinha.map((r) => ({ x: r.x, y: r.y })),
  ];
  // Limites reais do conteúdo, sem forçar simetria em torno de x=0 — uma versão anterior espelhava
  // esse cálculo (minX = -maxX) só pra manter o Presidente centralizado, mas a grade de membros
  // normalmente estica bem mais pra um lado que a árvore de liderança, então isso preenchia o lado
  // curto com espaço vazio do tamanho do lado longo (o texto acabava visualmente deslocado pra um
  // canto da página mesmo com `diagramaWrap` centralizando o bloco — o "espaço grande" que o Mateus
  // reportou, mesmo caso já corrigido na tela, ver spec de 27/08). `diagramaWrap: alignItems:
  // "center"` já centraliza o bloco (agora do tamanho certo) na página sozinho.
  const minXBruto = Math.min(...todasAsPosicoes.map((p) => p.x));
  const maxXBruto = Math.max(...todasAsPosicoes.map((p) => p.x + LARGURA_CAIXA));
  const minX = minXBruto;
  const maxX = maxXBruto;
  const minY = Math.min(...todasAsPosicoes.map((p) => p.y));
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
  // Encolhe pra caber numa folha A4 — nunca amplia (um organograma pequeno não deve virar gigante) —
  // mas nunca abaixo do piso de legibilidade (`ESCALA_MINIMA_PDF`). Um organograma grande o
  // bastante pra precisar encolher além do piso faz a FOLHA crescer (abaixo) em vez de continuar
  // encolhendo caixa e letra.
  const escala = Math.max(
    ESCALA_MINIMA_PDF,
    Math.min(1, LARGURA_PAGINA_UTIL_A4 / larguraConteudo, ALTURA_PAGINA_UTIL_A4 / alturaConteudo),
  );
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
  // A folha só cresce além do A4 quando o diagrama, mesmo no piso de escala, ainda não cabe na área
  // útil padrão — organograma pequeno/médio continua numa folha A4 comum, sem surpresa.
  const larguraPagina = Math.max(A4_LARGURA, larguraFinal + MARGEM_HORIZONTAL);
  const alturaPagina = Math.max(A4_ALTURA, alturaFinal + MARGEM_VERTICAL);

  return (
    <Document>
      <Page size={[larguraPagina, alturaPagina]} style={styles.page}>
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
              const fontSize = Math.max(FONTE_CABECALHO_MIN, FONTE_CABECALHO_BASE * escala);
              return (
                <View
                  key={c.grupo}
                  style={[styles.cabecalhoGrupo, { left: p.x, top: p.y, width: larguraCaixaPdf, height: alturaCabecalhoPdf }]}
                >
                  <Text style={[styles.cabecalhoGrupoTexto, { fontSize }]}>
                    {truncarParaCaber(c.grupo, larguraCaixaPdf - PADDING_HORIZONTAL_ROTULO * 2, fontSize, FATOR_LARGURA_CAIXA_ALTA)}
                  </Text>
                </View>
              );
            })}

            {diagrama.rotulosLinha.map((r) => {
              const p = pt(r);
              const fontSize = Math.max(FONTE_ROTULO_MIN, FONTE_ROTULO_BASE * escala);
              return (
                <View
                  key={r.linha}
                  style={[styles.rotuloLinha, { left: p.x, top: p.y, width: larguraRotuloPdf, height: alturaCaixaPdf }]}
                >
                  <Text style={[styles.rotuloLinhaTexto, { fontSize }]}>
                    {truncarParaCaber(r.linha, larguraRotuloPdf - PADDING_HORIZONTAL_ROTULO * 2, fontSize, FATOR_LARGURA_CAIXA_ALTA)}
                  </Text>
                </View>
              );
            })}

            {nos.map((no) => {
              const pos = diagrama.posicoes.get(no.id);
              if (!pos) return null;
              const p = pt(pos);
              const lideranca = !no.grupo;
              const larguraTexto = larguraCaixaPdf - PADDING_HORIZONTAL_CAIXA * 2;
              const fontSizeNome = Math.max(FONTE_NOME_MIN, FONTE_NOME_BASE * escala);
              const fontSizeCargo = Math.max(FONTE_CARGO_MIN, FONTE_CARGO_BASE * escala);
              return (
                <View
                  key={no.id}
                  style={[
                    styles.caixa,
                    lideranca ? styles.caixaLideranca : styles.caixaMembro,
                    { left: p.x, top: p.y, width: larguraCaixaPdf, height: alturaCaixaPdf },
                  ]}
                >
                  <Text
                    style={[
                      styles.caixaNome,
                      { fontSize: fontSizeNome, color: lideranca ? "#ffffff" : CORES.grenaEscuro },
                    ]}
                  >
                    {truncarParaCaber(no.nomeExibido, larguraTexto, fontSizeNome, FATOR_LARGURA_NOME)}
                  </Text>
                  {no.cargoExibido ? (
                    <Text
                      style={[
                        styles.caixaCargo,
                        { fontSize: fontSizeCargo, color: lideranca ? "#ffffffcc" : "#737373" },
                      ]}
                    >
                      {truncarParaCaber(no.cargoExibido, larguraTexto, fontSizeCargo, FATOR_LARGURA_CARGO)}
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
