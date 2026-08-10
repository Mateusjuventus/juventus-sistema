import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  CORES,
  DepartamentoEyebrow,
  DocumentoFooter,
  formatDataBr,
  sharedStyles,
  type LogoSrc,
} from "./logistica-shared";

/**
 * PDFs do módulo de Competições (resumo, classificação, cartões, suspensões, condição de jogo,
 * inscritos) — todos derivados das mesmas fontes das telas (jogos/súmulas + motor de regras),
 * ver docs/superpowers/specs/2026-08-10-competicoes-design.md. Mesmo padrão visual dos demais
 * PDFs do sistema (header com escudo, eyebrow do departamento, rodapé com carimbo).
 */

const styles = StyleSheet.create({
  headerLogo: { width: 44, height: 50, alignSelf: "center", objectFit: "contain" },
  titulo: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitulo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4, marginBottom: 14 },
  secaoBox: { marginTop: 8, padding: 6, borderWidth: 0.5, borderColor: "#e5e5e5", borderRadius: 4 },
  secaoTitulo: { fontSize: 10.5, fontWeight: 700, color: CORES.grenaEscuro, marginBottom: 3 },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 2.5,
    alignItems: "flex-start",
  },
  linhaHeader: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: "#d4d4d4" },
  headerCell: { fontSize: 6.5, fontWeight: 700, color: "#737373", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellMuted: { fontSize: 8, color: "#a3a3a3" },
  colNome: { flex: 1 },
  colPequena: { width: 44, textAlign: "center" },
  colMedia: { width: 110 },
  colGrande: { width: 150 },
  infoLinha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  infoLabel: { fontSize: 8, color: "#737373" },
  infoValor: { fontSize: 8, color: "#262626", fontWeight: 700 },
  destaqueJuventus: { color: CORES.grena, fontWeight: 700 },
});

function Cabecalho({
  juventusLogoSrc,
  titulo,
  subtitulo,
}: {
  juventusLogoSrc: LogoSrc;
  titulo: string;
  subtitulo: string;
}) {
  return (
    <>
      <DepartamentoEyebrow departamento="profissional" />
      {juventusLogoSrc ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={styles.headerLogo} src={juventusLogoSrc as string} />
      ) : null}
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.subtitulo}>{subtitulo}</Text>
    </>
  );
}

// ===== Resumo =====

export interface CompeticaoResumoPdfGrupo {
  nome: string;
  equipes: string[];
}

export interface CompeticaoResumoPdfFase {
  nome: string;
  status: string;
  grupos: CompeticaoResumoPdfGrupo[];
}

export interface CompeticaoResumoPdfJogo {
  confronto: string;
  data: string;
  faseGrupo: string;
  placar: string | null;
}

export function CompeticaoResumoDocument({
  juventusLogoSrc,
  geradoEm,
  subtitulo,
  dados,
  fases,
  jogos,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  subtitulo: string;
  dados: { label: string; valor: string }[];
  fases: CompeticaoResumoPdfFase[];
  jogos: CompeticaoResumoPdfJogo[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Cabecalho juventusLogoSrc={juventusLogoSrc} titulo="Resumo da Competição" subtitulo={subtitulo} />

        <View style={styles.secaoBox}>
          <Text style={styles.secaoTitulo}>Dados</Text>
          {dados.map((d) => (
            <View style={styles.infoLinha} key={d.label}>
              <Text style={styles.infoLabel}>{d.label}</Text>
              <Text style={styles.infoValor}>{d.valor}</Text>
            </View>
          ))}
        </View>

        {fases.map((fase) => (
          <View style={styles.secaoBox} key={fase.nome} wrap={false}>
            <Text style={styles.secaoTitulo}>
              {fase.nome} ({fase.status})
            </Text>
            {fase.grupos.length === 0 ? (
              <Text style={styles.cellMuted}>Sem grupos.</Text>
            ) : (
              fase.grupos.map((g) => (
                <View style={styles.infoLinha} key={g.nome}>
                  <Text style={styles.infoLabel}>{g.nome}</Text>
                  <Text style={styles.cell}>{g.equipes.length ? g.equipes.join(", ") : "—"}</Text>
                </View>
              ))
            )}
          </View>
        ))}

        {jogos.length > 0 ? (
          <View style={styles.secaoBox}>
            <Text style={styles.secaoTitulo}>Jogos vinculados</Text>
            <View style={styles.linhaHeader}>
              <Text style={[styles.colNome, styles.headerCell]}>Jogo</Text>
              <Text style={[styles.colPequena, styles.headerCell]}>Data</Text>
              <Text style={[styles.colMedia, styles.headerCell]}>Fase / Grupo</Text>
              <Text style={[styles.colPequena, styles.headerCell]}>Placar</Text>
            </View>
            {jogos.map((j, i) => (
              <View style={styles.linha} key={i}>
                <Text style={[styles.colNome, styles.cell]}>{j.confronto}</Text>
                <Text style={[styles.colPequena, styles.cell]}>{formatDataBr(j.data)}</Text>
                <Text style={[styles.colMedia, styles.cell]}>{j.faseGrupo}</Text>
                <Text style={[styles.colPequena, j.placar ? styles.cell : styles.cellMuted]}>{j.placar ?? "—"}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}

// ===== Classificação =====

export interface CompeticaoClassificacaoPdfLinha {
  posicao: number;
  equipe: string;
  pontos: number;
  jogos: number;
  aJogar: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  juventus: boolean;
}

export interface CompeticaoClassificacaoPdfGrupo {
  nome: string;
  faseNome: string;
  linhas: CompeticaoClassificacaoPdfLinha[];
  /** Vagas projetadas ("1º do Grupo 3 — hoje: Juventus") pra grupos de fases futuras. */
  vagas: string[];
}

export function CompeticaoClassificacaoDocument({
  juventusLogoSrc,
  geradoEm,
  subtitulo,
  grupos,
  criterios,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  subtitulo: string;
  grupos: CompeticaoClassificacaoPdfGrupo[];
  /** Ordem dos critérios de desempate aplicada (texto já montado) — registrada no rodapé do
   * documento, já que muda de competição pra competição. */
  criterios?: string;
}) {
  const colNum = { width: 26, textAlign: "center" as const };
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Cabecalho juventusLogoSrc={juventusLogoSrc} titulo="Classificação" subtitulo={subtitulo} />

        {grupos.map((g) => (
          <View style={styles.secaoBox} key={`${g.faseNome}-${g.nome}`} wrap={false}>
            <Text style={styles.secaoTitulo}>
              {g.nome} — {g.faseNome}
            </Text>
            {g.vagas.length > 0 ? (
              g.vagas.map((v, i) => (
                <Text style={styles.cell} key={i}>
                  {v}
                </Text>
              ))
            ) : (
              <>
                <View style={styles.linhaHeader}>
                  <Text style={[colNum, styles.headerCell]}>#</Text>
                  <Text style={[styles.colNome, styles.headerCell]}>Equipe</Text>
                  <Text style={[colNum, styles.headerCell]}>P</Text>
                  <Text style={[colNum, styles.headerCell]}>J</Text>
                  <Text style={[colNum, styles.headerCell]}>AJ</Text>
                  <Text style={[colNum, styles.headerCell]}>V</Text>
                  <Text style={[colNum, styles.headerCell]}>E</Text>
                  <Text style={[colNum, styles.headerCell]}>D</Text>
                  <Text style={[colNum, styles.headerCell]}>GP</Text>
                  <Text style={[colNum, styles.headerCell]}>GC</Text>
                  <Text style={[colNum, styles.headerCell]}>SG</Text>
                  <Text style={[colNum, styles.headerCell]}>CA</Text>
                  <Text style={[colNum, styles.headerCell]}>CV</Text>
                </View>
                {g.linhas.map((l) => (
                  <View style={styles.linha} key={l.equipe}>
                    <Text style={[colNum, styles.cell]}>{l.posicao}º</Text>
                    <Text style={[styles.colNome, styles.cell, ...(l.juventus ? [styles.destaqueJuventus] : [])]}>
                      {l.equipe}
                    </Text>
                    <Text style={[colNum, styles.cell, { fontWeight: 700 }]}>{l.pontos}</Text>
                    <Text style={[colNum, styles.cell]}>{l.jogos}</Text>
                    <Text style={[colNum, styles.cell]}>{l.aJogar}</Text>
                    <Text style={[colNum, styles.cell]}>{l.vitorias}</Text>
                    <Text style={[colNum, styles.cell]}>{l.empates}</Text>
                    <Text style={[colNum, styles.cell]}>{l.derrotas}</Text>
                    <Text style={[colNum, styles.cell]}>{l.golsPro}</Text>
                    <Text style={[colNum, styles.cell]}>{l.golsContra}</Text>
                    <Text style={[colNum, styles.cell]}>{l.saldo}</Text>
                    <Text style={[colNum, styles.cell]}>{l.cartoesAmarelos}</Text>
                    <Text style={[colNum, styles.cell]}>{l.cartoesVermelhos}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}

        {criterios ? (
          <Text style={[styles.cellMuted, { marginTop: 8 }]}>Critérios de desempate: {criterios}</Text>
        ) : null}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}

// ===== Cartões =====

export interface CompeticaoCartoesPdfLinha {
  atleta: string;
  amarelos: number;
  vermelhos: number;
  ultimoCartao: string;
  situacao: string;
}

export function CompeticaoCartoesDocument({
  juventusLogoSrc,
  geradoEm,
  subtitulo,
  linhas,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  subtitulo: string;
  linhas: CompeticaoCartoesPdfLinha[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Cabecalho juventusLogoSrc={juventusLogoSrc} titulo="Controle de Cartões" subtitulo={subtitulo} />

        <View style={styles.linhaHeader}>
          <Text style={[styles.colNome, styles.headerCell]}>Atleta</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Amarelos</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Vermelhos</Text>
          <Text style={[styles.colGrande, styles.headerCell]}>Último cartão</Text>
          <Text style={[styles.colMedia, styles.headerCell]}>Situação</Text>
        </View>
        {linhas.map((l, i) => (
          <View style={styles.linha} key={i}>
            <Text style={[styles.colNome, styles.cell]}>{l.atleta}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.amarelos}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.vermelhos}</Text>
            <Text style={[styles.colGrande, styles.cell]}>{l.ultimoCartao}</Text>
            <Text style={[styles.colMedia, styles.cell]}>{l.situacao}</Text>
          </View>
        ))}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}

// ===== Suspensões =====

export interface CompeticaoSuspensoesPdfLinha {
  atleta: string;
  tipo: string;
  motivo: string;
  jogoOrigem: string;
  jogos: number;
  cumpridos: number;
  restantes: number;
  proximoJogo: string;
  status: string;
}

export function CompeticaoSuspensoesDocument({
  juventusLogoSrc,
  geradoEm,
  subtitulo,
  linhas,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  subtitulo: string;
  linhas: CompeticaoSuspensoesPdfLinha[];
}) {
  const colNum = { width: 34, textAlign: "center" as const };
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={sharedStyles.page}>
        <Cabecalho juventusLogoSrc={juventusLogoSrc} titulo="Controle de Suspensões" subtitulo={subtitulo} />

        <View style={styles.linhaHeader}>
          <Text style={[styles.colMedia, styles.headerCell]}>Atleta</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Tipo</Text>
          <Text style={[styles.colGrande, styles.headerCell]}>Motivo</Text>
          <Text style={[styles.colGrande, styles.headerCell]}>Jogo de origem</Text>
          <Text style={[colNum, styles.headerCell]}>Jogos</Text>
          <Text style={[colNum, styles.headerCell]}>Cumpr.</Text>
          <Text style={[colNum, styles.headerCell]}>Rest.</Text>
          <Text style={[styles.colGrande, styles.headerCell]}>Próximo jogo</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Status</Text>
        </View>
        {linhas.map((l, i) => (
          <View style={styles.linha} key={i}>
            <Text style={[styles.colMedia, styles.cell]}>{l.atleta}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.tipo}</Text>
            <Text style={[styles.colGrande, styles.cell]}>{l.motivo}</Text>
            <Text style={[styles.colGrande, styles.cell]}>{l.jogoOrigem}</Text>
            <Text style={[colNum, styles.cell]}>{l.jogos}</Text>
            <Text style={[colNum, styles.cell]}>{l.cumpridos}</Text>
            <Text style={[colNum, styles.cell]}>{l.restantes}</Text>
            <Text style={[styles.colGrande, styles.cell]}>{l.proximoJogo}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.status}</Text>
          </View>
        ))}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}

// ===== Condição de Jogo =====

export interface CompeticaoCondicaoPdfLinha {
  atleta: string;
  posicao: string;
  condicao: string;
  detalhe: string;
}

export function CompeticaoCondicaoDocument({
  juventusLogoSrc,
  geradoEm,
  subtitulo,
  linhas,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  subtitulo: string;
  linhas: CompeticaoCondicaoPdfLinha[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Cabecalho juventusLogoSrc={juventusLogoSrc} titulo="Condição de Jogo" subtitulo={subtitulo} />

        <View style={styles.linhaHeader}>
          <Text style={[styles.colNome, styles.headerCell]}>Atleta</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Posição</Text>
          <Text style={[styles.colMedia, styles.headerCell]}>Condição</Text>
          <Text style={[styles.colGrande, styles.headerCell]}>Detalhe</Text>
        </View>
        {linhas.map((l, i) => (
          <View style={styles.linha} key={i}>
            <Text style={[styles.colNome, styles.cell]}>{l.atleta}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.posicao}</Text>
            <Text style={[styles.colMedia, styles.cell, { fontWeight: 700 }]}>{l.condicao}</Text>
            <Text style={[styles.colGrande, styles.cell]}>{l.detalhe}</Text>
          </View>
        ))}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}

// ===== Atletas Inscritos =====

export interface CompeticaoInscritosPdfLinha {
  atleta: string;
  posicao: string;
  lista: string;
  dataInscricao: string;
}

export function CompeticaoInscritosDocument({
  juventusLogoSrc,
  geradoEm,
  subtitulo,
  linhas,
}: {
  juventusLogoSrc: LogoSrc;
  geradoEm: Date;
  subtitulo: string;
  linhas: CompeticaoInscritosPdfLinha[];
}) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Cabecalho juventusLogoSrc={juventusLogoSrc} titulo="Atletas Inscritos" subtitulo={subtitulo} />

        <View style={styles.linhaHeader}>
          <Text style={[styles.colNome, styles.headerCell]}>Atleta</Text>
          <Text style={[styles.colMedia, styles.headerCell]}>Posição</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Lista</Text>
          <Text style={[styles.colPequena, styles.headerCell]}>Inscrição</Text>
        </View>
        {linhas.map((l, i) => (
          <View style={styles.linha} key={i}>
            <Text style={[styles.colNome, styles.cell]}>{l.atleta}</Text>
            <Text style={[styles.colMedia, styles.cell]}>{l.posicao}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.lista}</Text>
            <Text style={[styles.colPequena, styles.cell]}>{l.dataInscricao}</Text>
          </View>
        ))}

        <DocumentoFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
