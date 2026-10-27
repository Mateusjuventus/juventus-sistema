import { Document, Page, Text, View, Image, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Ficha individual do atleta em PDF — cabeçalho (foto, nome, posição) + os campos marcados no modal
 * de geração (`components/atletas/ficha-atleta-modal.tsx`), organizados nas mesmas 3 seções da tela
 * "Ver atleta" (Dados Pessoais / Dados Esportivos / Dados do Contrato), mais as duas seções "ricas"
 * da Ficha mestre (Dados de Jogo com gráfico, Anotações com histórico) — ver
 * docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md. Pedido original do
 * Mateus em 2026-10-22 ("gerar a ficha do atleta" com "a opção de eu selecionar quais dados que eu
 * quero que apareça") + em 2026-10-27 ("quero que no relatório contenha os gráficos e não somente
 * os números").
 *
 * O componente é "burro" de propósito: só recebe `secoes`/`dadosDeJogo`/`anotacoes` já filtrados e
 * formatados pela rota (`app/atletas/[id]/ficha/pdf/route.tsx` e `app/base/atletas/[categoria]/[id]/
 * ficha/pdf/route.tsx`) — a lógica de quais campos existem, como formatar cada um e como buscar as
 * estatísticas/anotações fica nas rotas (uma pra Profissional, outra pra Base), não aqui.
 * `dadosDeJogo`/`anotacoes` em `undefined`/`null` significa "seção não marcada no modal" — a seção
 * nem aparece no PDF (diferente de uma seção marcada mas vazia, que mostra o aviso "Nenhum(a)...").
 */

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  // Retrato (não circular) — mesmo padrão do Relatório de Dispensa (lib/pdf/relatorio-dispensa-
  // document.tsx), que é como a foto do atleta aparece no resto do sistema (cards/telas de
  // listagem). Pedido do Mateus em 2026-10-27: a Ficha estava com a foto circular, destoando disso.
  foto: { width: 84, height: 104, borderRadius: 3, objectFit: "cover", borderWidth: 0.75, borderColor: "#c4c4c4" },
  fotoPlaceholder: {
    width: 84,
    height: 104,
    borderRadius: 3,
    backgroundColor: "#f5f5f5",
    borderWidth: 0.75,
    borderColor: "#c4c4c4",
  },
  tituloDocumento: { fontSize: 8.5, fontWeight: 700, color: CORES.grena, textTransform: "uppercase", letterSpacing: 1 },
  nome: { fontSize: 16, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 2 },
  subtitulo: { fontSize: 9.5, color: "#525252", marginTop: 2 },
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
  dadoItem: { width: "50%", marginBottom: 8, paddingRight: 8 },
  dadoLabel: { fontSize: 7.5, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  dadoValor: { fontSize: 9.5, color: "#1f1f1f", marginTop: 1 },
  avisoSecao: { fontSize: 9, color: "#a3a3a3", marginTop: 10 },
  avisoGeral: { fontSize: 9.5, color: "#a3a3a3", marginTop: 20, textAlign: "center" },

  // Dados de Jogo — gráfico de participação (mesma técnica de `relatorio-geral-base-document.tsx`,
  // ver `caminhoFatiaDonut`) + grade de números (mesmo padrão de `atleta-relatorio-document.tsx`).
  periodoTexto: { fontSize: 8.5, color: "#737373", marginTop: 8 },
  donutLinha: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  donutLegenda: { flex: 1, marginLeft: 22 },
  donutLegendaLinha: { flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  donutBolinha: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  donutRotulo: { flex: 1, fontSize: 8.5, color: "#404040" },
  donutValorJogos: { width: 50, fontSize: 9.5, fontWeight: 700, color: "#1f1f1f", textAlign: "right" },
  statRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  statBox: { width: 118, borderWidth: 0.5, borderColor: "#e5e5e5", borderRadius: 4, padding: 8 },
  statLabel: { fontSize: 7, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  statValor: { fontSize: 15, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 2 },

  // Anotações — histórico com autor/data; a entrada de Relatório de Dispensa (só na Base) ganha uma
  // faixa à esquerda, mesmo recurso visual da tela (`border-l-4 border-l-grena` em
  // `app/base/atletas/[categoria]/[id]/anotacoes/page.tsx`).
  anotacaoItem: {
    backgroundColor: "#fafafa",
    borderRadius: 3,
    padding: 8,
    marginTop: 8,
  },
  anotacaoItemDispensa: {
    borderLeftWidth: 2.5,
    borderLeftColor: CORES.grena,
  },
  anotacaoTag: {
    fontSize: 7,
    fontWeight: 700,
    color: CORES.grena,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  anotacaoTexto: { fontSize: 9, color: "#1f1f1f", lineHeight: 1.4 },
  anotacaoAutor: { fontSize: 7.5, color: "#a3a3a3", marginTop: 4, textAlign: "right" },
});

function DadoItem({ label, valor }: { label: string; valor: string | null }) {
  return (
    <View style={styles.dadoItem}>
      <Text style={styles.dadoLabel}>{label}</Text>
      <Text style={styles.dadoValor}>{valor ?? "—"}</Text>
    </View>
  );
}

function StatBox({ label, valor }: { label: string; valor: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValor}>{valor}</Text>
    </View>
  );
}

/**
 * Caminho SVG de uma fatia de donut (duplicado de `relatorio-geral-base-document.tsx` — mesmo
 * motivo de lá: o react-pdf só suporta `stroke-dasharray` em `<Circle>`, não `stroke-dashoffset`,
 * então a técnica da tela não funciona aqui; desenha-se cada fatia como um `<Path>` fechado).
 */
function caminhoFatiaDonut(
  cx: number,
  cy: number,
  rExterno: number,
  rInterno: number,
  fracaoInicioBruta: number,
  fracaoFimBruta: number,
): string {
  const fracaoInicio = fracaoInicioBruta;
  const fracaoFim = Math.min(fracaoFimBruta, fracaoInicio + 0.9998);
  const ponto = (r: number, fracao: number) => {
    const angulo = -Math.PI / 2 + fracao * 2 * Math.PI;
    return [cx + r * Math.cos(angulo), cy + r * Math.sin(angulo)];
  };
  const largeArc = fracaoFim - fracaoInicio > 0.5 ? 1 : 0;
  const [x1, y1] = ponto(rExterno, fracaoInicio);
  const [x2, y2] = ponto(rExterno, fracaoFim);
  const [x3, y3] = ponto(rInterno, fracaoFim);
  const [x4, y4] = ponto(rInterno, fracaoInicio);
  return [
    `M ${x1} ${y1}`,
    `A ${rExterno} ${rExterno} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInterno} ${rInterno} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

// Mesmas cores do gráfico de Participação na tela (`DonutChart` em `app/.../dados-de-jogo/page.tsx`,
// valores de `lib/theme.ts`) — Titular/Banco/Não Convocado.
const CORES_PARTICIPACAO = { titular: "#5C0A35", banco: "#B98F1E", naoConvocado: "#B0B0B0" };

export interface FichaAtletaDadosDeJogoStats {
  titular: number;
  banco: number;
  naoConvocado: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  minutosTotais: number;
  jogosMaisUmTempo: number;
  jogosJogoCompleto: number;
}

export interface FichaAtletaDadosDeJogo {
  /** Já formatado pela rota — ex.: "Período: completo (toda a passagem pelo clube)" ou "Período:
   * 01/01/2026 – 30/06/2026". */
  periodoTexto: string;
  stats: FichaAtletaDadosDeJogoStats;
  duracaoReferencia: { primeiroTempo: number; total: number };
}

function fatiasParticipacao(stats: FichaAtletaDadosDeJogoStats) {
  const total = stats.titular + stats.banco + stats.naoConvocado;
  const base = [
    { label: "Titular", valor: stats.titular, cor: CORES_PARTICIPACAO.titular },
    { label: "Banco", valor: stats.banco, cor: CORES_PARTICIPACAO.banco },
    { label: "Não Convocado", valor: stats.naoConvocado, cor: CORES_PARTICIPACAO.naoConvocado },
  ];
  let acumulado = 0;
  return base
    .filter((f) => f.valor > 0)
    .map((f) => {
      const fracao = total > 0 ? f.valor / total : 0;
      const inicio = acumulado;
      acumulado += fracao;
      return { ...f, inicio, fim: acumulado };
    });
}

export interface FichaAtletaAnotacaoItem {
  tipo: "anotacao" | "dispensa";
  texto: string;
  /** Já com o fallback "—" aplicado pela rota quando não houver autor registrado. */
  autor: string;
  /** Já formatada pela rota (data, ou data+hora quando disponível). */
  dataTexto: string;
}

export interface FichaAtletaSecao {
  titulo: string;
  /** `null` quando a seção tem campos marcados mas nenhum dado pra mostrar (ex.: nenhum contrato
   * vigente cadastrado) — mostra `avisoVazio` no lugar da grade. */
  dados: { label: string; valor: string | null }[] | null;
  /** Mensagem mostrada quando `dados` é `null`. */
  avisoVazio?: string;
}

export function FichaAtletaDocument({
  juventusLogoSrc,
  fotoSrc,
  nome,
  subtitulo,
  secoes,
  dadosDeJogo,
  anotacoes,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  nome: string;
  subtitulo: string;
  secoes: FichaAtletaSecao[];
  /** `undefined`/`null` = seção "Dados de Jogo" não foi marcada no modal, não aparece no PDF. */
  dadosDeJogo?: FichaAtletaDadosDeJogo | null;
  /** `undefined`/`null` = seção "Anotações" não foi marcada no modal, não aparece no PDF. Array
   * vazio = marcada, mas sem nenhuma anotação ainda (mostra aviso). */
  anotacoes?: FichaAtletaAnotacaoItem[] | null;
}) {
  const algumaSecaoComConteudo =
    secoes.some((s) => s.dados === null || s.dados.length > 0) || !!dadosDeJogo || !!anotacoes;

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.header}>
          {fotoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.foto} src={fotoSrc as string} />
          ) : (
            <View style={styles.fotoPlaceholder} />
          )}
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={sharedStyles.escudo} src={juventusLogoSrc as string} />
          ) : null}
          <View>
            <Text style={styles.tituloDocumento}>Ficha Individual do Atleta</Text>
            <Text style={styles.nome}>{nome}</Text>
            <Text style={styles.subtitulo}>{subtitulo}</Text>
          </View>
        </View>

        {secoes.map((secao) =>
          secao.dados === null || secao.dados.length > 0 ? (
            <View key={secao.titulo}>
              <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
              {secao.dados === null ? (
                <Text style={styles.avisoSecao}>{secao.avisoVazio ?? "Nenhum dado cadastrado."}</Text>
              ) : (
                <View style={styles.dadosGrid}>
                  {secao.dados.map((d) => (
                    <DadoItem key={d.label} label={d.label} valor={d.valor} />
                  ))}
                </View>
              )}
            </View>
          ) : null,
        )}

        {dadosDeJogo ? (
          <View>
            <Text style={styles.secaoTitulo}>Dados de Jogo</Text>
            <Text style={styles.periodoTexto}>{dadosDeJogo.periodoTexto}</Text>
            <View style={styles.donutLinha} wrap={false}>
              <Svg width={64} height={64} viewBox="0 0 64 64">
                {fatiasParticipacao(dadosDeJogo.stats).map((f) => (
                  <Path key={f.label} d={caminhoFatiaDonut(32, 32, 30, 15, f.inicio, f.fim)} fill={f.cor} />
                ))}
              </Svg>
              <View style={styles.donutLegenda}>
                {[
                  { label: "Titular", valor: dadosDeJogo.stats.titular, cor: CORES_PARTICIPACAO.titular },
                  { label: "Banco", valor: dadosDeJogo.stats.banco, cor: CORES_PARTICIPACAO.banco },
                  { label: "Não Convocado", valor: dadosDeJogo.stats.naoConvocado, cor: CORES_PARTICIPACAO.naoConvocado },
                ].map((f) => (
                  <View style={styles.donutLegendaLinha} key={f.label}>
                    <View style={[styles.donutBolinha, { backgroundColor: f.cor }]} />
                    <Text style={styles.donutRotulo}>{f.label}</Text>
                    <Text style={styles.donutValorJogos}>{f.valor}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.statRow}>
              <StatBox label="Gols" valor={dadosDeJogo.stats.gols} />
              <StatBox label="Assistências" valor={dadosDeJogo.stats.assistencias} />
              <StatBox label="Cartões Amarelos" valor={dadosDeJogo.stats.cartoesAmarelos} />
              <StatBox label="Cartões Vermelhos" valor={dadosDeJogo.stats.cartoesVermelhos} />
              <StatBox label="Minutos totais" valor={dadosDeJogo.stats.minutosTotais} />
              <StatBox
                label={`Jogos com +${dadosDeJogo.duracaoReferencia.primeiroTempo}min`}
                valor={dadosDeJogo.stats.jogosMaisUmTempo}
              />
              <StatBox
                label={`Jogo completo (${dadosDeJogo.duracaoReferencia.total}min)`}
                valor={dadosDeJogo.stats.jogosJogoCompleto}
              />
            </View>
          </View>
        ) : null}

        {anotacoes ? (
          <View>
            <Text style={styles.secaoTitulo}>Anotações</Text>
            {anotacoes.length === 0 ? (
              <Text style={styles.avisoSecao}>Nenhuma anotação registrada.</Text>
            ) : (
              anotacoes.map((item, i) => (
                <View
                  key={i}
                  style={item.tipo === "dispensa" ? [styles.anotacaoItem, styles.anotacaoItemDispensa] : styles.anotacaoItem}
                  wrap={false}
                >
                  {item.tipo === "dispensa" ? <Text style={styles.anotacaoTag}>Relatório de Dispensa</Text> : null}
                  <Text style={styles.anotacaoTexto}>{item.texto}</Text>
                  <Text style={styles.anotacaoAutor}>
                    {item.autor} · {item.dataTexto}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {!algumaSecaoComConteudo ? (
          <Text style={styles.avisoGeral}>Nenhum dado selecionado para esta ficha.</Text>
        ) : null}

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
