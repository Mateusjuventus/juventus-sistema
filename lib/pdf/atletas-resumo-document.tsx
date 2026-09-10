import { Document, Page, Text, View, Image, Svg, Path, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, type LogoSrc } from "./logistica-shared";
import { calcularEscalaCardsAtletas } from "./atletas-resumo-escala";
import { fatiasPizza } from "@/lib/futebol/grafico-pizza";
import { categoriaDaPosicao, CATEGORIA_POSICAO_SIGLA } from "@/lib/futebol/categoria-posicao";
import { CONTRATO_ATLETA_COR, CONTRATO_ATLETA_LABEL } from "@/lib/futebol/contrato-atleta";
import { ATLETA_POSICAO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaBaseTipoContrato } from "@/lib/supabase/types";

/**
 * PDF "Resumo de Atletas" — resumo (Status/Posições/Contrato, mesmos três blocos da tela) + a grade
 * de cards dos atletas, tudo numa folha só (pedido explícito do Mateus: "tudo numa única página"),
 * no mesmo espírito do Campograma (`campograma-document.tsx`): cards encolhem proporcionalmente pra
 * caber elencos grandes sem quebrar página (ver `calcularEscalaCardsAtletas`). Reaproveita
 * `fatiasPizza` (a mesma matemática do gráfico de pizza da tela) pro gráfico de Contrato, pra nunca
 * ficar diferente do que aparece no navegador.
 *
 * Cards mostram os mesmos dados do `AtletaCard` da tela (foto, sigla de posição, número da camisa,
 * selo de contrato, nome, nascimento, CPF e contrato) — não depende da escolha de colunas do export
 * em Excel (`ExportColunasModal`), que é sobre planilha, não sobre o card.
 */

export interface AtletaResumoPdfItem {
  id: string;
  nome: string;
  cpf: string | null;
  fotoUrl: string | null;
  dataNascimento: string | null;
  dataFimContrato: string | null;
  tipoContrato: AtletaBaseTipoContrato | null;
  posicao: string;
  numeroCamisa: number | null;
  dispensado: boolean;
  status: string;
}

export interface StatusOpcaoPdf {
  value: string;
  label: string;
}

const CARD_LARGURA_BASE = 58;
const FOTO_ALTURA_BASE = 62;
const NOME_FONTE_BASE = 6;
const INFO_FONTE_BASE = 5;
const SELO_TAMANHO_BASE = 10;
const SELO_FONTE_BASE = 5;
const SIGLA_FONTE_BASE = 5.5;

const styles = StyleSheet.create({
  page: { padding: 26, paddingBottom: 46, fontFamily: "Helvetica", fontSize: 8, color: "#262626" },
  topo: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  topoLogo: { width: 26, height: 26, objectFit: "contain" },
  topoTitulo: { fontSize: 14, fontWeight: 700, color: CORES.grenaEscuro, textTransform: "uppercase", letterSpacing: 0.3 },
  topoSub: { fontSize: 8, color: "#a3a3a3", marginTop: 1 },

  resumoRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  resumoBox: { flex: 1, borderWidth: 0.75, borderColor: "#e5e5e5", borderRadius: 4, padding: 8 },
  resumoTitulo: {
    fontSize: 6.5,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  chip: {
    borderWidth: 0.75,
    borderColor: "#e5e5e5",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  chipNumero: { fontSize: 7, fontWeight: 700, color: "#262626" },
  chipLabel: { fontSize: 6, color: "#525252" },

  posicaoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  posicaoChip: { width: "31%", borderWidth: 0.75, borderColor: "#e5e5e5", borderRadius: 3, padding: 3 },
  posicaoSiglaLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  posicaoSigla: { fontSize: 5.5, fontWeight: 700, color: "#525252" },
  posicaoNumero: { fontSize: 7, fontWeight: 700, color: "#262626" },
  posicaoNome: { fontSize: 5, color: "#a3a3a3", marginTop: 1 },

  contratoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contratoLegenda: { flex: 1, gap: 2 },
  contratoItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  contratoSwatch: { width: 5, height: 5, borderRadius: 1 },
  contratoLabel: { fontSize: 6, color: "#525252", flex: 1 },
  contratoValor: { fontSize: 6, fontWeight: 700, color: "#262626" },

  cardsGrid: { flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" },
  card: {
    borderWidth: 0.75,
    borderColor: "#e5e5e5",
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  fotoWrap: { width: "100%", backgroundColor: "#f5f5f5", position: "relative" },
  fotoPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: CORES.grena },
  fotoPlaceholderTexto: { color: "#ffffff", fontWeight: 700 },
  siglaOverlay: { position: "absolute", top: 2, left: 3, color: "#ffffff", fontWeight: 700 },
  numeroOverlay: { position: "absolute", top: 2, right: 3, color: "#ffffff", fontWeight: 700 },
  seloContrato: {
    position: "absolute",
    bottom: 2,
    left: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  seloContratoTexto: { color: "#ffffff", fontWeight: 700 },
  nomeFaixa: {
    backgroundColor: "rgba(92,10,53,0.35)",
    textAlign: "center",
    fontWeight: 700,
    color: CORES.grenaEscuro,
    paddingVertical: 1.5,
  },
  infoBloco: { backgroundColor: CORES.grenaEscuro, paddingVertical: 3, paddingHorizontal: 3 },
  infoNascimento: { textAlign: "center", fontWeight: 700, color: "#ffffff" },
  infoLinha: { textAlign: "center", color: "rgba(255,255,255,0.75)", marginTop: 1 },
});

function ResumoStatus({ statusOptions, contagens, total }: { statusOptions: StatusOpcaoPdf[]; contagens: Map<string, number>; total: number }) {
  return (
    <View style={styles.resumoBox}>
      <Text style={styles.resumoTitulo}>Status</Text>
      <View style={styles.chipsWrap}>
        <View style={styles.chip}>
          <Text style={styles.chipNumero}>{total}</Text>
          <Text style={styles.chipLabel}>Total</Text>
        </View>
        {statusOptions.map((opcao) => (
          <View style={styles.chip} key={opcao.value}>
            <Text style={styles.chipNumero}>{contagens.get(opcao.value) ?? 0}</Text>
            <Text style={styles.chipLabel}>{opcao.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResumoPosicoes({ contagens }: { contagens: Map<string, number> }) {
  return (
    <View style={styles.resumoBox}>
      <Text style={styles.resumoTitulo}>Posições</Text>
      <View style={styles.posicaoGrid}>
        {ATLETA_POSICAO_OPTIONS.map((posicao) => {
          const categoria = categoriaDaPosicao(posicao);
          return (
            <View style={styles.posicaoChip} key={posicao}>
              <View style={styles.posicaoSiglaLinha}>
                <Text style={styles.posicaoSigla}>{categoria ? CATEGORIA_POSICAO_SIGLA[categoria] : "—"}</Text>
                <Text style={styles.posicaoNumero}>{contagens.get(posicao) ?? 0}</Text>
              </View>
              <Text style={styles.posicaoNome}>{posicao}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ResumoContrato({
  contratoOptions,
  contagens,
  total,
}: {
  contratoOptions: AtletaBaseTipoContrato[];
  contagens: Map<AtletaBaseTipoContrato, number>;
  total: number;
}) {
  const fatias = fatiasPizza(contratoOptions.map((tipo) => ({ chave: tipo, valor: contagens.get(tipo) ?? 0 })));

  return (
    <View style={styles.resumoBox}>
      <Text style={styles.resumoTitulo}>Contrato</Text>
      <View style={styles.contratoRow}>
        {total > 0 ? (
          <Svg width={40} height={40} viewBox="0 0 36 36">
            {fatias.map((fatia) => (
              <Path key={fatia.chave} d={fatia.path} fill={CONTRATO_ATLETA_COR[fatia.chave]} stroke="#ffffff" strokeWidth={0.5} />
            ))}
          </Svg>
        ) : (
          <Text style={{ fontSize: 6, color: "#a3a3a3" }}>sem contrato</Text>
        )}
        <View style={styles.contratoLegenda}>
          {contratoOptions.map((tipo) => {
            const count = contagens.get(tipo) ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <View style={styles.contratoItem} key={tipo}>
                <View style={[styles.contratoSwatch, { backgroundColor: CONTRATO_ATLETA_COR[tipo] }]} />
                <Text style={styles.contratoLabel}>{CONTRATO_ATLETA_LABEL[tipo]}</Text>
                <Text style={styles.contratoValor}>
                  {count} ({pct}%)
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function CardAtletaPdf({ atleta, escala }: { atleta: AtletaResumoPdfItem; escala: number }) {
  const categoria = categoriaDaPosicao(atleta.posicao);
  const sigla = categoria ? CATEGORIA_POSICAO_SIGLA[categoria] : "—";
  const largura = CARD_LARGURA_BASE * escala;
  const alturaFoto = FOTO_ALTURA_BASE * escala;
  const seloTamanho = SELO_TAMANHO_BASE * escala;

  return (
    <View style={[styles.card, { width: largura, margin: 2 * escala }]} wrap={false}>
      <View style={[styles.fotoWrap, { height: alturaFoto }]}>
        {atleta.fotoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={{ width: "100%", height: "100%", objectFit: "cover" }} src={atleta.fotoUrl} />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Text style={[styles.fotoPlaceholderTexto, { fontSize: 12 * escala }]}>
              {atleta.nome.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.siglaOverlay, { fontSize: SIGLA_FONTE_BASE * escala }]}>{sigla}</Text>
        {atleta.numeroCamisa ? (
          <Text style={[styles.numeroOverlay, { fontSize: SIGLA_FONTE_BASE * escala }]}>{atleta.numeroCamisa}</Text>
        ) : null}
        {atleta.tipoContrato ? (
          <View
            style={[
              styles.seloContrato,
              { width: seloTamanho, height: seloTamanho, backgroundColor: CONTRATO_ATLETA_COR[atleta.tipoContrato] },
            ]}
          >
            <Text style={[styles.seloContratoTexto, { fontSize: SELO_FONTE_BASE * escala }]}>
              {CONTRATO_ATLETA_LABEL[atleta.tipoContrato].charAt(0)}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.nomeFaixa, { fontSize: NOME_FONTE_BASE * escala, paddingHorizontal: 2 }]}>
        {atleta.nome}
      </Text>

      <View style={styles.infoBloco}>
        <Text style={[styles.infoNascimento, { fontSize: (NOME_FONTE_BASE - 0.5) * escala }]}>
          {formatDataBr(atleta.dataNascimento)}
        </Text>
        <Text style={[styles.infoLinha, { fontSize: INFO_FONTE_BASE * escala }]}>
          CPF {atleta.cpf ?? "—"}
        </Text>
        <Text style={[styles.infoLinha, { fontSize: INFO_FONTE_BASE * escala }]}>
          {atleta.dispensado ? "Encerrado " : "Até "}
          {formatDataBr(atleta.dataFimContrato)}
        </Text>
      </View>
    </View>
  );
}

export function AtletasResumoDocument({
  titulo,
  atletas,
  contratoOptions,
  statusOptions,
  juventusLogoSrc,
  geradoEm,
}: {
  titulo: string;
  atletas: AtletaResumoPdfItem[];
  contratoOptions: AtletaBaseTipoContrato[];
  statusOptions: StatusOpcaoPdf[];
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
}) {
  const contagensStatus = new Map<string, number>();
  const contagensPosicao = new Map<string, number>();
  const contagensContrato = new Map<AtletaBaseTipoContrato, number>();
  let totalComContrato = 0;

  for (const a of atletas) {
    contagensStatus.set(a.status, (contagensStatus.get(a.status) ?? 0) + 1);
    contagensPosicao.set(a.posicao, (contagensPosicao.get(a.posicao) ?? 0) + 1);
    if (a.tipoContrato) {
      contagensContrato.set(a.tipoContrato, (contagensContrato.get(a.tipoContrato) ?? 0) + 1);
      totalComContrato += 1;
    }
  }

  const escala = calcularEscalaCardsAtletas(atletas.length);
  const dataTexto = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(geradoEm);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topo}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.topoLogo} src={juventusLogoSrc as string} />
          ) : null}
          <View>
            <Text style={styles.topoTitulo}>{titulo}</Text>
            <Text style={styles.topoSub}>
              {dataTexto} · {atletas.length} atleta{atletas.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        <View style={styles.resumoRow} wrap={false}>
          <ResumoStatus statusOptions={statusOptions} contagens={contagensStatus} total={atletas.length} />
          <ResumoPosicoes contagens={contagensPosicao} />
          <ResumoContrato contratoOptions={contratoOptions} contagens={contagensContrato} total={totalComContrato} />
        </View>

        <View style={styles.cardsGrid}>
          {atletas.map((atleta) => (
            <CardAtletaPdf key={atleta.id} atleta={atleta} escala={escala} />
          ))}
        </View>

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
