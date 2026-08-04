import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Relatório do atleta em PDF — cabeçalho (foto, nome, posição, número) + o conteúdo da aba "Dados
 * de Jogo" (participação, contadores de gols/assistências/cartões, minutagem) no período filtrado,
 * mais opcionalmente um bloco de Dados Pessoais. Ver
 * docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md.
 */

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  foto: { width: 64, height: 64, borderRadius: 32, objectFit: "cover" },
  fotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#d4d4d4",
  },
  nome: { fontSize: 16, fontWeight: 700, color: CORES.grenaEscuro },
  subtitulo: { fontSize: 9.5, color: "#525252", marginTop: 2 },
  periodo: { fontSize: 8.5, color: "#737373", marginTop: 3 },
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
  statRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  statBox: {
    width: 118,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
  },
  statLabel: { fontSize: 7, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  statValor: { fontSize: 15, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 2 },
  dadosGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  dadoItem: { width: "50%", marginBottom: 8, paddingRight: 8 },
  dadoLabel: { fontSize: 7.5, color: "#737373", textTransform: "uppercase", letterSpacing: 0.3 },
  dadoValor: { fontSize: 9.5, color: "#1f1f1f", marginTop: 1 },
});

function StatBox({ label, valor }: { label: string; valor: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValor}>{valor}</Text>
    </View>
  );
}

function DadoItem({ label, valor }: { label: string; valor: string | null }) {
  return (
    <View style={styles.dadoItem}>
      <Text style={styles.dadoLabel}>{label}</Text>
      <Text style={styles.dadoValor}>{valor ?? "—"}</Text>
    </View>
  );
}

export interface AtletaRelatorioEstatisticas {
  titular: number;
  banco: number;
  naoConvocado: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  minutosTotais: number;
  jogosMais60min: number;
  jogosMais90min: number;
}

export interface AtletaRelatorioDadosPessoais {
  rg: string;
  cpf: string;
  dataNascimento: string | null;
  telefone: string | null;
  naturalidade: string | null;
  tipoContrato: string | null;
  dataInicioClube: string | null;
  dataFimContrato: string | null;
  empresarioNome: string | null;
}

export function AtletaRelatorioDocument({
  juventusLogoSrc,
  fotoSrc,
  nome,
  subtitulo,
  periodoTexto,
  stats,
  dadosPessoais,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  nome: string;
  subtitulo: string;
  periodoTexto: string;
  stats: AtletaRelatorioEstatisticas;
  dadosPessoais: AtletaRelatorioDadosPessoais | null;
}) {
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
            <Text style={styles.nome}>{nome}</Text>
            <Text style={styles.subtitulo}>{subtitulo}</Text>
            <Text style={styles.periodo}>{periodoTexto}</Text>
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Participação</Text>
        <View style={styles.statRow}>
          <StatBox label="Titular" valor={stats.titular} />
          <StatBox label="Banco" valor={stats.banco} />
          <StatBox label="Não Convocado" valor={stats.naoConvocado} />
        </View>

        <Text style={styles.secaoTitulo}>Gols, Assistências e Cartões</Text>
        <View style={styles.statRow}>
          <StatBox label="Gols" valor={stats.gols} />
          <StatBox label="Assistências" valor={stats.assistencias} />
          <StatBox label="Cartões Amarelos" valor={stats.cartoesAmarelos} />
          <StatBox label="Cartões Vermelhos" valor={stats.cartoesVermelhos} />
        </View>

        <Text style={styles.secaoTitulo}>Minutagem</Text>
        <View style={styles.statRow}>
          <StatBox label="Minutos totais" valor={stats.minutosTotais} />
          <StatBox label="Jogos com +60min" valor={stats.jogosMais60min} />
          <StatBox label="Jogos com +90min" valor={stats.jogosMais90min} />
        </View>

        {dadosPessoais ? (
          <>
            <Text style={styles.secaoTitulo}>Dados Pessoais</Text>
            <View style={styles.dadosGrid}>
              <DadoItem label="RG" valor={dadosPessoais.rg} />
              <DadoItem label="CPF" valor={dadosPessoais.cpf} />
              <DadoItem label="Data de nascimento" valor={formatDataBr(dadosPessoais.dataNascimento)} />
              <DadoItem label="Telefone" valor={dadosPessoais.telefone} />
              <DadoItem label="Naturalidade" valor={dadosPessoais.naturalidade} />
              <DadoItem label="Tipo de contrato" valor={dadosPessoais.tipoContrato} />
              <DadoItem label="Início no clube" valor={formatDataBr(dadosPessoais.dataInicioClube)} />
              <DadoItem label="Fim de contrato" valor={formatDataBr(dadosPessoais.dataFimContrato)} />
              <DadoItem label="Empresário/representante" valor={dadosPessoais.empresarioNome} />
            </View>
          </>
        ) : null}

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
