import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, sharedStyles, type LogoSrc } from "./logistica-shared";
import { CATEGORIAS_EVENTO, COR_CATEGORIA_JOGO, type DiaGrade } from "@/lib/futebol/calendario";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Altura fixa de cada semana da grade — com 6 semanas (o pior caso: mês que começa perto do fim de
 * uma semana e tem 31 dias) cabe com folga dentro da página A4 sem precisar quebrar página (ver o
 * cálculo de orçamento de altura no comentário de `CalendarioDocument`). Fixa (não `minHeight`) de
 * propósito, pra garantir que a grade toda cabe sempre na mesma altura prevista. */
const ALTURA_LINHA = 92;

const styles = StyleSheet.create({
  headerLogo: { width: 30, height: 35, alignSelf: "center", objectFit: "contain" },
  titulo: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 8, color: "#737373", marginTop: 3, marginBottom: 12 },

  semanaHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: "#d4d4d4",
    paddingBottom: 4,
    marginBottom: 4,
  },
  semanaHeaderCel: {
    flex: 1,
    textAlign: "center",
    fontSize: 7,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
  },

  semanaRow: { flexDirection: "row" },
  diaCel: {
    flex: 1,
    height: ALTURA_LINHA,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    padding: 3,
  },
  diaCelForaDoMes: { backgroundColor: "#fafafa" },
  diaCelHoje: { borderWidth: 1, borderColor: CORES.dourado },
  diaNumero: { fontSize: 7, fontWeight: 700, color: "#404040" },
  diaNumeroForaDoMes: { color: "#c7c7c7" },

  itemJogoRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  escudoMini: { width: 9, height: 9, objectFit: "contain" },
  escudoMiniPlaceholder: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },
  escudoMiniPlaceholderTexto: { fontSize: 3.5, fontWeight: 700, color: "#a3a3a3" },
  itemJogoHorario: { fontSize: 5.5, fontWeight: 700, color: CORES.grenaEscuro, marginLeft: 1 },

  itemEventoRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  itemEventoBolinha: { width: 4, height: 4, borderRadius: 2 },
  itemEventoTitulo: { fontSize: 5.5, color: "#404040", flex: 1 },

  itemMais: { fontSize: 5, color: "#a3a3a3", marginTop: 1 },

  legendaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendaBolinha: { width: 6, height: 6, borderRadius: 3 },
  legendaLabel: { fontSize: 7, color: "#525252" },
});

export interface CalendarioPdfItemJogo {
  tipo: "jogo";
  horario: string | null;
  mandante: boolean;
  adversarioNome: string;
  adversarioLogoSrc: LogoSrc;
}

export interface CalendarioPdfItemEvento {
  tipo: "evento";
  horario: string | null;
  /** Já truncado pra caber na célula (ver a rota de PDF) — o react-pdf não tem `text-overflow:
   * ellipsis`, então o corte precisa acontecer antes de chegar aqui. */
  titulo: string;
  cor: string;
}

export type CalendarioPdfItem = CalendarioPdfItemJogo | CalendarioPdfItemEvento;

function EscudoMini({ src, nome }: { src: LogoSrc; nome: string }) {
  if (!src) {
    return (
      <View style={styles.escudoMiniPlaceholder}>
        <Text style={styles.escudoMiniPlaceholderTexto}>{nome.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image style={styles.escudoMini} src={src as string} />;
}

function ItemJogo({ item, juventusLogoSrc }: { item: CalendarioPdfItemJogo; juventusLogoSrc: LogoSrc }) {
  const juventus = { src: juventusLogoSrc, nome: "Juventus" };
  const adversario = { src: item.adversarioLogoSrc, nome: item.adversarioNome };
  const [esquerda, direita] = item.mandante ? [juventus, adversario] : [adversario, juventus];
  return (
    <View style={styles.itemJogoRow}>
      <EscudoMini src={esquerda.src} nome={esquerda.nome} />
      <EscudoMini src={direita.src} nome={direita.nome} />
      {item.horario ? <Text style={styles.itemJogoHorario}>{item.horario.slice(0, 5)}</Text> : null}
    </View>
  );
}

function ItemEvento({ item }: { item: CalendarioPdfItemEvento }) {
  return (
    <View style={styles.itemEventoRow}>
      <View style={[styles.itemEventoBolinha, { backgroundColor: item.cor }]} />
      <Text style={styles.itemEventoTitulo}>{item.titulo}</Text>
    </View>
  );
}

function DiaCelula({
  dia,
  itens,
  hojeStr,
  juventusLogoSrc,
}: {
  dia: DiaGrade;
  itens: CalendarioPdfItem[];
  hojeStr: string;
  juventusLogoSrc: LogoSrc;
}) {
  const numeroDia = Number(dia.data.slice(8, 10));
  const ehHoje = dia.data === hojeStr;
  const visiveis = itens.slice(0, 3);
  const restantes = itens.length - visiveis.length;

  const celStyle = {
    ...styles.diaCel,
    ...(!dia.noMes ? styles.diaCelForaDoMes : {}),
    ...(ehHoje ? styles.diaCelHoje : {}),
  };
  const numeroStyle = { ...styles.diaNumero, ...(!dia.noMes ? styles.diaNumeroForaDoMes : {}) };

  return (
    <View style={celStyle} wrap={false}>
      <Text style={numeroStyle}>{numeroDia}</Text>
      {visiveis.map((item, i) =>
        item.tipo === "jogo" ? (
          <ItemJogo key={i} item={item} juventusLogoSrc={juventusLogoSrc} />
        ) : (
          <ItemEvento key={i} item={item} />
        ),
      )}
      {restantes > 0 ? <Text style={styles.itemMais}>+{restantes}</Text> : null}
    </View>
  );
}

/**
 * PDF do widget "Calendário" da Home do Futebol Profissional — grade visual do mês, igual ao
 * calendário na tela (com os escudos dos jogos nos quadradinhos dos dias), tudo numa página só. O
 * Mateus pediu explicitamente pra não ser mais uma tabela em lista (ver
 * docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md e a leva de
 * feedback que trocou isso).
 *
 * Orçamento de altura (A4, 841.89pt, `sharedStyles.page` com padding 32 em cima e 60 embaixo — área
 * útil de ~750pt): cabeçalho (~55pt) + linha de dias da semana (~16pt) + legenda (~20pt) deixam
 * ~660pt pra grade. Com `ALTURA_LINHA = 92`, até 6 semanas (o máximo que `gradeDoMes` produz) usam
 * 552pt — cabe com folga, sem precisar quebrar página.
 */
export function CalendarioDocument({
  juventusLogoSrc,
  mesLabel,
  geradoEm,
  hojeStr,
  grade,
  itensPorDia,
}: {
  juventusLogoSrc: LogoSrc;
  mesLabel: string;
  geradoEm: Date;
  hojeStr: string;
  grade: DiaGrade[];
  itensPorDia: Record<string, CalendarioPdfItem[]>;
}) {
  const semanas: DiaGrade[][] = [];
  for (let i = 0; i < grade.length; i += 7) semanas.push(grade.slice(i, i + 7));

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
        ) : null}
        <Text style={styles.titulo}>Calendário — {mesLabel}</Text>
        <Text style={styles.subtitulo}>Jogos e eventos do mês</Text>

        <View style={styles.semanaHeaderRow}>
          {DIAS_SEMANA.map((d) => (
            <Text key={d} style={styles.semanaHeaderCel}>
              {d}
            </Text>
          ))}
        </View>

        {semanas.map((semana, i) => (
          <View style={styles.semanaRow} key={i}>
            {semana.map((dia) => (
              <DiaCelula
                key={dia.data}
                dia={dia}
                itens={itensPorDia[dia.data] ?? []}
                hojeStr={hojeStr}
                juventusLogoSrc={juventusLogoSrc}
              />
            ))}
          </View>
        ))}

        <View style={styles.legendaRow}>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaBolinha, { backgroundColor: COR_CATEGORIA_JOGO }]} />
            <Text style={styles.legendaLabel}>Jogo</Text>
          </View>
          {CATEGORIAS_EVENTO.map((c) => (
            <View style={styles.legendaItem} key={c.chave}>
              <View style={[styles.legendaBolinha, { backgroundColor: c.cor }]} />
              <Text style={styles.legendaLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
