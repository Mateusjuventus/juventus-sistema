import { Document, Page, Text, View, Image, StyleSheet, Svg, Line } from "@react-pdf/renderer";
import {
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
  type LogoSrc,
} from "./logistica-shared";
import {
  ALTURA_CAIXA,
  ALTURA_ITEM_CARTAO,
  ALTURA_TITULO_CARTAO,
  LARGURA_CAIXA,
  LARGURA_CARTAO,
  PADDING_CARTAO_V,
  alturaCartao,
  calcularConectores,
  calcularLayoutAutomatico,
  cartoesConectadosDoLayout,
  contarCartoesPorPessoaVinculada,
  corNomeCartao,
  type OrganogramaNo,
} from "@/lib/futebol/organograma";

/**
 * PDF do Organograma da Base (`/base/comissao-tecnica/organograma`) — mesmo diagrama da tela: um
 * cartão por comissão/departamento (título = nome da linha, lista de função→pessoa embaixo),
 * supervisor como nível de liderança de verdade, conectores em ângulo reto (ver
 * `components/organograma-editor.tsx` e docs/superpowers/specs/2026-09-15-organograma-cartoes-por-
 * comissao-design.md), redesenhado em `@react-pdf/renderer` porque a tela usa HTML/CSS absoluto que
 * o react-pdf não interpreta. A posição de cada caixa/cartão é a MESMA da tela: `calcularLayoutAutomatico`
 * é a mesma função, com a mesma entrada — nunca diverge do que o Mateus está vendo na tela. Diferente
 * da tela (que rola quando não cabe), o PDF continua encolhendo/crescendo a página pra caber numa
 * folha só (não tem como uma folha "rolar").
 */

export interface OrganogramaBaseNoDocumento {
  id: string;
  comissaoTecnicaBaseId: string | null;
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
// Piso de escala do diagrama inteiro (caixa/cartão E letra encolhem sempre juntos, nunca só uma das
// duas — ver "Atualização 27/08" na spec original). Organogramas pequenos continuam cabendo numa
// folha A4 normal; organogramas grandes o bastante pra precisar de mais que isso fazem a folha
// crescer (ver `larguraPagina`/`alturaPagina`) em vez de continuar cortando texto pra caber numa
// folha pequena demais.
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
  caixaLideranca: {
    position: "absolute",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: CORES.grena,
  },
  caixaNome: { fontWeight: 700 },
  caixaCargo: { marginTop: 1 },
  cartao: {
    position: "absolute",
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 0.75,
    borderColor: "#d4d4d4",
  },
  cartaoTitulo: {
    backgroundColor: CORES.grena,
    color: "#ffffff",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  cartaoItem: { justifyContent: "center", overflow: "hidden" },
  cartaoItemFuncao: {
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    color: "#737373",
  },
  cartaoItemNome: { fontWeight: 700, marginTop: 1 },
});

// Tamanhos de fonte de referência (pt, escala 1). Como `ESCALA_MINIMA_PDF` acima já garante que a
// escala do diagrama INTEIRO nunca fica abaixo de 0.85, esses `_MIN` na prática funcionam só como
// rede de segurança. `overflow: "hidden"` continua como rede de segurança pra um nome
// excepcionalmente comprido mesmo num organograma pequeno (escala 1).
const FONTE_NOME_BASE = 11;
const FONTE_NOME_MIN = 9;
const FONTE_CARGO_BASE = 9;
const FONTE_CARGO_MIN = 7.5;
const FONTE_CARTAO_TITULO_BASE = 9;
const FONTE_CARTAO_TITULO_MIN = 7.5;
const FONTE_CARTAO_FUNCAO_BASE = 6.5;
const FONTE_CARTAO_FUNCAO_MIN = 5.5;
const FONTE_CARTAO_NOME_BASE = 9;
const FONTE_CARTAO_NOME_MIN = 7.5;

// Espelham o `paddingHorizontal`/padding das caixas acima — usados só pra calcular a largura
// disponível pro texto em `truncarParaCaber`.
const PADDING_HORIZONTAL_CAIXA = 6;
const PADDING_HORIZONTAL_CARTAO_ITEM = 6;

// Largura média de um caractere como fração do tamanho da fonte, usada por `truncarParaCaber` —
// nome (negrito, minúsculas/maiúsculas misturadas), cargo/função (normal ou caixa alta).
const FATOR_LARGURA_NOME = 0.58;
const FATOR_LARGURA_CARGO = 0.5;
const FATOR_LARGURA_CAIXA_ALTA = 0.68;

interface Ponto {
  x: number;
  y: number;
}

/**
 * Corta o texto (com "…" no fim) pra caber numa linha só dentro de `larguraDisponivel`, usando uma
 * largura média de caractere estimada (react-pdf não mede texto antes de desenhar). `fatorLargura` é
 * a largura média de um caractere como fração do tamanho da fonte (maior para negrito/caixa alta).
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

/** Cor da fonte (hex, react-pdf não entende classes Tailwind) pra cada resultado de `corNomeCartao`. */
function hexCorNome(cor: "normal" | "dourado" | "vermelho"): string {
  if (cor === "dourado") return CORES.dourado;
  if (cor === "vermelho") return "#DC2626";
  return CORES.grenaEscuro;
}

/** Mesmo cálculo da tela (posição de cada caixa de liderança e de cada cartão, conectores em ângulo
 * reto) — só sem os overrides de arrasto (o PDF é uma foto do que está salvo, não tem interação). */
function calcularDiagrama(nos: OrganogramaBaseNoDocumento[], linhaReportaPara: Map<string, string | null>) {
  const nosLayout = nos.map(
    (n): OrganogramaNo => ({ id: n.id, reportaPara: n.reportaPara, grupo: n.grupo, linha: n.linha, ordem: n.ordem }),
  );
  const layout = calcularLayoutAutomatico(nosLayout, linhaReportaPara);

  const posicoesLideranca = new Map<string, Ponto>();
  for (const no of nos) {
    if (no.grupo) continue;
    if (no.posX !== null && no.posY !== null) posicoesLideranca.set(no.id, { x: no.posX, y: no.posY });
    else posicoesLideranca.set(no.id, layout.posicoesLideranca.get(no.id) ?? { x: 0, y: 0 });
  }

  // Mesmo cálculo de conectores da tela, via `calcularConectores`/`cartoesConectadosDoLayout` —
  // garante que tela e PDF nunca divirjam.
  const conectores = calcularConectores(nosLayout, posicoesLideranca, cartoesConectadosDoLayout(layout));

  const todasAsCaixas = [
    ...[...posicoesLideranca.values()].map((p) => ({ x: p.x, y: p.y, w: LARGURA_CAIXA, h: ALTURA_CAIXA })),
    ...layout.cartoes.map((c) => {
      const p = layout.posicoesCartao.get(c.chave)!;
      return { x: p.x, y: p.y, w: LARGURA_CARTAO, h: alturaCartao(c.itens.length) };
    }),
  ];
  const minX = Math.min(...todasAsCaixas.map((c) => c.x));
  const maxX = Math.max(...todasAsCaixas.map((c) => c.x + c.w));
  const minY = Math.min(...todasAsCaixas.map((c) => c.y));
  const maxY = Math.max(...todasAsCaixas.map((c) => c.y + c.h));

  return { layout, posicoesLideranca, conectores, minX, minY, maxX, maxY };
}

export function OrganogramaBaseDocument({
  juventusLogoSrc,
  geradoEm,
  nos,
  linhasReportaPara,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  nos: OrganogramaBaseNoDocumento[];
  linhasReportaPara: { linha: string; reportaPara: string | null }[];
}) {
  const linhaReportaParaMap = new Map(linhasReportaPara.map((l) => [l.linha, l.reportaPara]));
  const diagrama = calcularDiagrama(nos, linhaReportaParaMap);
  const nosPorId = new Map(nos.map((n) => [n.id, n]));
  const comissaoIdPorNo = new Map(nos.map((n) => [n.id, n.comissaoTecnicaBaseId]));
  const contagemPorPessoa = contarCartoesPorPessoaVinculada(diagrama.layout.cartoes, comissaoIdPorNo);

  const larguraConteudo = diagrama.maxX - diagrama.minX + DIAGRAMA_PADDING * 2;
  const alturaConteudo = diagrama.maxY - diagrama.minY + DIAGRAMA_PADDING * 2;
  // Encolhe pra caber numa folha A4 — nunca amplia — mas nunca abaixo do piso de legibilidade
  // (`ESCALA_MINIMA_PDF`). Um organograma grande o bastante pra precisar encolher além do piso faz a
  // FOLHA crescer (abaixo) em vez de continuar encolhendo caixa/cartão e letra.
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
  const larguraCartaoPdf = LARGURA_CARTAO * escala;
  const alturaTituloCartaoPdf = ALTURA_TITULO_CARTAO * escala;
  const alturaItemCartaoPdf = ALTURA_ITEM_CARTAO * escala;
  const paddingCartaoVPdf = PADDING_CARTAO_V * escala;
  // A folha só cresce além do A4 quando o diagrama, mesmo no piso de escala, ainda não cabe na área
  // útil padrão — organograma pequeno/médio continua numa folha A4 comum, sem surpresa.
  const larguraPagina = Math.max(A4_LARGURA, larguraFinal + MARGEM_HORIZONTAL);
  const alturaPagina = Math.max(A4_ALTURA, alturaFinal + MARGEM_VERTICAL);

  const fontSizeNome = Math.max(FONTE_NOME_MIN, FONTE_NOME_BASE * escala);
  const fontSizeCargo = Math.max(FONTE_CARGO_MIN, FONTE_CARGO_BASE * escala);
  const fontSizeCartaoTitulo = Math.max(FONTE_CARTAO_TITULO_MIN, FONTE_CARTAO_TITULO_BASE * escala);
  const fontSizeCartaoFuncao = Math.max(FONTE_CARTAO_FUNCAO_MIN, FONTE_CARTAO_FUNCAO_BASE * escala);
  const fontSizeCartaoNome = Math.max(FONTE_CARTAO_NOME_MIN, FONTE_CARTAO_NOME_BASE * escala);

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

            {[...diagrama.posicoesLideranca.entries()].map(([id, pos]) => {
              const no = nosPorId.get(id);
              if (!no) return null;
              const p = pt(pos);
              const larguraTexto = larguraCaixaPdf - PADDING_HORIZONTAL_CAIXA * 2;
              return (
                <View
                  key={id}
                  style={[styles.caixaLideranca, { left: p.x, top: p.y, width: larguraCaixaPdf, height: alturaCaixaPdf }]}
                >
                  <Text style={[styles.caixaNome, { fontSize: fontSizeNome, color: "#ffffff" }]}>
                    {truncarParaCaber(no.nomeExibido, larguraTexto, fontSizeNome, FATOR_LARGURA_NOME)}
                  </Text>
                  {no.cargoExibido ? (
                    <Text style={[styles.caixaCargo, { fontSize: fontSizeCargo, color: "#ffffffcc" }]}>
                      {truncarParaCaber(no.cargoExibido, larguraTexto, fontSizeCargo, FATOR_LARGURA_CARGO)}
                    </Text>
                  ) : null}
                </View>
              );
            })}

            {diagrama.layout.cartoes.map((cartao) => {
              const pos = diagrama.layout.posicoesCartao.get(cartao.chave);
              if (!pos) return null;
              const p = pt(pos);
              const alturaCartaoPdf = alturaCartao(cartao.itens.length) * escala;
              const larguraTextoTitulo = larguraCartaoPdf - PADDING_HORIZONTAL_CARTAO_ITEM * 2;
              const larguraTextoItem = larguraCartaoPdf - PADDING_HORIZONTAL_CARTAO_ITEM * 2;
              return (
                <View
                  key={cartao.chave}
                  style={[styles.cartao, { left: p.x, top: p.y, width: larguraCartaoPdf, height: alturaCartaoPdf }]}
                >
                  <View style={[styles.cartaoTitulo, { height: alturaTituloCartaoPdf }]}>
                    <Text style={{ fontSize: fontSizeCartaoTitulo, color: "#ffffff", fontWeight: 700 }}>
                      {truncarParaCaber(cartao.titulo, larguraTextoTitulo, fontSizeCartaoTitulo, FATOR_LARGURA_CAIXA_ALTA)}
                    </Text>
                  </View>
                  <View style={{ paddingTop: paddingCartaoVPdf, paddingBottom: paddingCartaoVPdf }}>
                    {cartao.itens.map((itemId) => {
                      const item = nosPorId.get(itemId);
                      if (!item) return null;
                      const vinculadoDuplicado = item.comissaoTecnicaBaseId
                        ? (contagemPorPessoa.get(item.comissaoTecnicaBaseId) ?? 0) >= 2
                        : false;
                      const cor = corNomeCartao(item.comissaoTecnicaBaseId ? null : item.nomeExibido, vinculadoDuplicado);
                      return (
                        <View
                          key={itemId}
                          style={[
                            styles.cartaoItem,
                            { height: alturaItemCartaoPdf, paddingHorizontal: PADDING_HORIZONTAL_CARTAO_ITEM },
                          ]}
                        >
                          <Text style={[styles.cartaoItemFuncao, { fontSize: fontSizeCartaoFuncao }]}>
                            {truncarParaCaber(item.grupo ?? "", larguraTextoItem, fontSizeCartaoFuncao, FATOR_LARGURA_CAIXA_ALTA)}
                          </Text>
                          <Text style={[styles.cartaoItemNome, { fontSize: fontSizeCartaoNome, color: hexCorNome(cor) }]}>
                            {truncarParaCaber(item.nomeExibido, larguraTextoItem, fontSizeCartaoNome, FATOR_LARGURA_NOME)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
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
