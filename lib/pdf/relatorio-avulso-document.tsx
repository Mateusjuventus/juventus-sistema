import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCPF } from "@/lib/validation/cpf";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * PDF "avulso" (lista personalizada) — usado quando nenhum dos documentos fixos do sistema serve
 * (Rooming List, Ônibus, Credenciamento, Presskit, todos amarrados a um jogo já convocado). Não
 * depende de nenhum jogo real: o título, a descrição e (se marcado) as informações de jogo são
 * todos digitados na hora pelo usuário em `app/relatorios/avulso/page.tsx`. As pessoas vêm direto
 * do cadastro (atletas, comissão técnica, staff — qualquer um, convocado ou não) e as colunas
 * exibidas são escolhidas pelo usuário.
 */

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  escudo: { width: 44, height: 44, objectFit: "contain" },
  titulo: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: CORES.grenaEscuro,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoJogo: { textAlign: "center", fontSize: 9, color: "#525252", marginTop: 4 },
  descricao: {
    fontSize: 9.5,
    color: "#404040",
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 1.4,
  },
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
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#f5f5f5",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  headerCell: { fontSize: 7.5, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  cell: { fontSize: 8.5, color: "#262626" },
  cellNome: { fontSize: 8.5, fontWeight: 700, color: "#1f1f1f" },
  colNome: { flex: 1.6 },
  colPadrao: { width: 68 },
  emptyState: { fontSize: 8, color: "#a3a3a3", paddingVertical: 6, paddingHorizontal: 8 },
});

export interface RelatorioAvulsoPessoa {
  nome: string;
  dataNascimento: string | null;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  extra: string | null;
}

export interface RelatorioAvulsoColunas {
  nascimento: boolean;
  cpf: boolean;
  rg: boolean;
  telefone: boolean;
  extra: boolean;
}

export interface RelatorioAvulsoInfoJogo {
  adversario: string;
  competicao: string;
  data: string;
  horario: string;
  local: string;
}

function TabelaPessoas({
  titulo,
  labelExtra,
  pessoas,
  colunas,
}: {
  titulo: string;
  labelExtra: string;
  pessoas: RelatorioAvulsoPessoa[];
  colunas: RelatorioAvulsoColunas;
}) {
  if (pessoas.length === 0) return null;

  return (
    <View wrap={false}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.colNome, styles.headerCell]}>Nome completo</Text>
        {colunas.nascimento ? <Text style={[styles.colPadrao, styles.headerCell]}>Nascimento</Text> : null}
        {colunas.cpf ? <Text style={[styles.colPadrao, styles.headerCell]}>CPF</Text> : null}
        {colunas.rg ? <Text style={[styles.colPadrao, styles.headerCell]}>RG</Text> : null}
        {colunas.telefone ? <Text style={[styles.colPadrao, styles.headerCell]}>Telefone</Text> : null}
        {colunas.extra ? <Text style={[styles.colPadrao, styles.headerCell]}>{labelExtra}</Text> : null}
      </View>
      {pessoas.map((p, i) => (
        <View style={styles.tableRow} key={i}>
          <Text style={[styles.colNome, styles.cellNome]}>{p.nome}</Text>
          {colunas.nascimento ? (
            <Text style={[styles.colPadrao, styles.cell]}>{formatDataBr(p.dataNascimento)}</Text>
          ) : null}
          {colunas.cpf ? <Text style={[styles.colPadrao, styles.cell]}>{p.cpf ? formatCPF(p.cpf) : "—"}</Text> : null}
          {colunas.rg ? <Text style={[styles.colPadrao, styles.cell]}>{p.rg ?? "—"}</Text> : null}
          {colunas.telefone ? <Text style={[styles.colPadrao, styles.cell]}>{p.telefone ?? "—"}</Text> : null}
          {colunas.extra ? <Text style={[styles.colPadrao, styles.cell]}>{p.extra ?? "—"}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function RelatorioAvulsoDocument({
  juventusLogoSrc,
  titulo,
  descricao,
  infoJogo,
  atletas,
  comissao,
  staff,
  colunas,
}: {
  juventusLogoSrc: LogoSrc;
  titulo: string;
  descricao: string | null;
  infoJogo: RelatorioAvulsoInfoJogo | null;
  atletas: RelatorioAvulsoPessoa[];
  comissao: RelatorioAvulsoPessoa[];
  staff: RelatorioAvulsoPessoa[];
  colunas: RelatorioAvulsoColunas;
}) {
  const infoJogoTexto = infoJogo
    ? [
        infoJogo.adversario ? `Juventus × ${infoJogo.adversario}` : null,
        infoJogo.competicao || null,
        infoJogo.data ? formatDataBr(infoJogo.data) : null,
        infoJogo.horario || null,
        infoJogo.local || null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const nenhumaPessoa = atletas.length === 0 && comissao.length === 0 && staff.length === 0;

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <View style={styles.header}>
          {juventusLogoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.escudo} src={juventusLogoSrc as string} />
          ) : null}
        </View>
        <Text style={styles.titulo}>{titulo}</Text>
        {infoJogoTexto ? <Text style={styles.infoJogo}>{infoJogoTexto}</Text> : null}
        {descricao ? <Text style={styles.descricao}>{descricao}</Text> : null}

        {nenhumaPessoa ? (
          <Text style={styles.emptyState}>Nenhuma pessoa selecionada.</Text>
        ) : (
          <>
            <TabelaPessoas titulo="Atletas" labelExtra="Posição" pessoas={atletas} colunas={colunas} />
            <TabelaPessoas titulo="Comissão Técnica" labelExtra="Função" pessoas={comissao} colunas={colunas} />
            <TabelaPessoas titulo="Staff" labelExtra="Função" pessoas={staff} colunas={colunas} />
          </>
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
