import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCPF } from "@/lib/validation/cpf";
import { CORES, DocumentoFooter, formatDataBr, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * PDF "avulso" (lista personalizada) — usado quando nenhum dos documentos fixos do sistema serve
 * (Rooming List, Ônibus, Credenciamento, Presskit, todos amarrados a um jogo já convocado). Não
 * depende de nenhum jogo real: o título, a descrição e (se marcado) as informações de jogo são
 * todos digitados na hora pelo usuário em `app/relatorios/avulso/page.tsx` (podendo vir de um jogo
 * já cadastrado, que só preenche os campos). As pessoas vêm direto do cadastro (atletas, comissão
 * técnica, staff — qualquer um, convocado ou não) e as colunas exibidas são escolhidas pelo
 * usuário, cobrindo praticamente todo dado presente nos cadastros de cada tipo de pessoa.
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
  headerCell: { fontSize: 7, fontWeight: 700, color: "#525252", textTransform: "uppercase" },
  cell: { fontSize: 8, color: "#262626" },
  cellNome: { fontSize: 8.5, fontWeight: 700, color: "#1f1f1f" },
  // `flexShrink: 0` é essencial aqui: sem isso, o motor de layout encolhe as colunas de volta pra
  // caber na largura da página mesmo com `width` explícito, ignorando o piso definido em
  // `larguraColunas` — é exatamente esse encolhimento "escondido" que causava sobreposição de texto
  // quando muitas colunas estavam marcadas ao mesmo tempo.
  colNome: { paddingRight: 4, flexShrink: 0 },
  colExtra: { paddingRight: 4, flexShrink: 0 },
  emptyState: { fontSize: 8, color: "#a3a3a3", paddingVertical: 6, paddingHorizontal: 8 },
});

/** Largura útil da tabela em pontos: A4 (595.28pt) menos os `padding: 32` de `sharedStyles.page`
 * dos dois lados e o `paddingHorizontal: 8` de `tableRow`/`tableHeaderRow`, também dos dois lados. */
const LARGURA_TABELA = 595.28 - 2 * 32 - 2 * 8;
/** Largura mínima de uma coluna extra "comum" — abaixo disso, valores comuns e sem espaço pra
 * quebrar (CPF "123.456.789-00", telefone "(31) 99999-1111", datas) ficam maiores que a própria
 * coluna e "vazam" visualmente por cima da coluna vizinha (confirmado testando manualmente várias
 * larguras: 72pt é o menor valor que não gera esse vazamento com esses formatos). Colunas com
 * valores tipicamente maiores (e-mail, endereço) têm seu próprio `larguraMinima` em `ColunaDef`. */
const LARGURA_EXTRA_MINIMA = 72;
/** Largura mínima da coluna Nome completo, pelo mesmo motivo acima. */
const LARGURA_NOME_MINIMA = 110;
/** Número máximo de colunas extras renderizadas por tabela — ver o comentário em `TabelaPessoas`. */
const LIMITE_COLUNAS_EXTRAS = 10;

/** Calcula a largura (em pontos) de cada coluna ativa desta tabela: cada uma usa sempre sua própria
 * largura mínima seguro (`c.larguraMinima ?? LARGURA_EXTRA_MINIMA` — nunca menos que isso, custe o
 * que custar à largura total da tabela) e a coluna Nome completo absorve o que sobrar (ou também
 * usa seu próprio mínimo, se as colunas extras já tomarem todo o espaço disponível). Usar largura
 * fixa em pontos (em vez de `flex`, e sem encolher proporcionalmente conforme mais colunas são
 * marcadas) é proposital: só larguras comprovadamente seguras evitam que o texto de uma coluna vaze
 * visualmente por cima da vizinha — dividir igualmente entre muitas colunas mais estreitas reabre
 * esse problema mesmo com um "piso" único. */
function larguraColunas(colunasAtivas: ColunaDef[]): { nome: number; porColuna: number[] } {
  const porColuna = colunasAtivas.map((c) => c.larguraMinima ?? LARGURA_EXTRA_MINIMA);
  const somaExtras = porColuna.reduce((soma, largura) => soma + largura, 0);
  const nome = Math.max(LARGURA_NOME_MINIMA, LARGURA_TABELA - somaExtras);
  return { nome, porColuna };
}

/** Uma pessoa (atleta, membro da comissão técnica ou staff) com todos os dados que hoje existem
 * nos respectivos cadastros e que podem aparecer no relatório avulso. Campos que não fazem sentido
 * pro tipo de pessoa (ex.: `posicao` pra comissão/staff) sempre vêm `null`. Valores que dependiam de
 * um enum/catálogo (pé dominante, tipo de contrato, situação, quarto preferido, categoria) já
 * chegam com o rótulo resolvido — o documento só exibe o texto. */
export interface RelatorioAvulsoPessoa {
  nome: string;
  apelido: string | null;
  dataNascimento: string | null;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  posicao: string | null;
  funcao: string | null;
  numeroCamisa: number | null;
  numeroRegistro: string | null;
  peDominante: string | null;
  naturalidade: string | null;
  dataInicioClube: string | null;
  tipoContrato: string | null;
  dataFimContrato: string | null;
  contratoFormacao: boolean | null;
  empresarioNome: string | null;
  status: string | null;
  /** Categoria de idade do Futebol de Base (Sub-20 etc.) — sempre `null` no Futebol Profissional. */
  categoria: string | null;
}

export interface RelatorioAvulsoColunas {
  apelido: boolean;
  nascimento: boolean;
  cpf: boolean;
  rg: boolean;
  telefone: boolean;
  email: boolean;
  endereco: boolean;
  posicao: boolean;
  funcao: boolean;
  numeroCamisa: boolean;
  numeroRegistro: boolean;
  peDominante: boolean;
  naturalidade: boolean;
  dataInicioClube: boolean;
  tipoContrato: boolean;
  dataFimContrato: boolean;
  contratoFormacao: boolean;
  empresarioNome: boolean;
  status: boolean;
  categoria: boolean;
}

export interface RelatorioAvulsoInfoJogo {
  adversario: string;
  competicao: string;
  data: string;
  horario: string;
  local: string;
}

interface ColunaDef {
  chave: keyof RelatorioAvulsoColunas;
  label: string;
  valor: (p: RelatorioAvulsoPessoa) => string;
  /** Largura mínima própria desta coluna, em pontos — usar quando o valor típico é um token sem
   * espaços pra quebrar linha (e-mails, por exemplo) e por isso precisa de bem mais espaço que o
   * piso padrão pra não vazar por cima da coluna vizinha. Ausente = usa `LARGURA_EXTRA_MINIMA`. */
  larguraMinima?: number;
}

const COLUNA_APELIDO: ColunaDef = { chave: "apelido", label: "Apelido", valor: (p) => p.apelido ?? "—" };
const COLUNA_NASCIMENTO: ColunaDef = {
  chave: "nascimento",
  label: "Nascimento",
  valor: (p) => formatDataBr(p.dataNascimento),
};
const COLUNA_CPF: ColunaDef = { chave: "cpf", label: "CPF", valor: (p) => (p.cpf ? formatCPF(p.cpf) : "—") };
const COLUNA_RG: ColunaDef = { chave: "rg", label: "RG", valor: (p) => p.rg ?? "—" };
const COLUNA_TELEFONE: ColunaDef = { chave: "telefone", label: "Telefone", valor: (p) => p.telefone ?? "—" };
// E-mails não têm espaço nenhum pra quebrar linha — precisam de uma coluna bem mais larga que o
// piso padrão pra não vazar por cima da coluna seguinte (testado manualmente: e-mails corporativos
// comuns como "marcos.ferreira@juventus.com.br" só ficam contidos com ~150pt).
const COLUNA_EMAIL: ColunaDef = {
  chave: "email",
  label: "E-mail",
  valor: (p) => p.email ?? "—",
  larguraMinima: 210,
};
const COLUNA_ENDERECO: ColunaDef = {
  chave: "endereco",
  label: "Endereço",
  valor: (p) => p.endereco ?? "—",
  larguraMinima: 110,
};
const COLUNA_CATEGORIA: ColunaDef = { chave: "categoria", label: "Categoria", valor: (p) => p.categoria ?? "—" };
const COLUNA_POSICAO: ColunaDef = { chave: "posicao", label: "Posição", valor: (p) => p.posicao ?? "—" };
const COLUNA_FUNCAO: ColunaDef = { chave: "funcao", label: "Função", valor: (p) => p.funcao ?? "—" };
const COLUNA_NUMERO_CAMISA: ColunaDef = {
  chave: "numeroCamisa",
  label: "Nº Camisa",
  valor: (p) => (p.numeroCamisa != null ? String(p.numeroCamisa) : "—"),
};
const COLUNA_NUMERO_REGISTRO: ColunaDef = {
  chave: "numeroRegistro",
  label: "Nº CBF/FPF",
  valor: (p) => p.numeroRegistro ?? "—",
};
const COLUNA_PE_DOMINANTE: ColunaDef = {
  chave: "peDominante",
  label: "Pé dominante",
  valor: (p) => p.peDominante ?? "—",
};
const COLUNA_NATURALIDADE: ColunaDef = {
  chave: "naturalidade",
  label: "Naturalidade",
  valor: (p) => p.naturalidade ?? "—",
};
const COLUNA_INICIO_CLUBE: ColunaDef = {
  chave: "dataInicioClube",
  label: "Início no clube",
  valor: (p) => formatDataBr(p.dataInicioClube),
};
const COLUNA_TIPO_CONTRATO: ColunaDef = {
  chave: "tipoContrato",
  label: "Tipo de contrato",
  valor: (p) => p.tipoContrato ?? "—",
};
const COLUNA_FIM_CONTRATO: ColunaDef = {
  chave: "dataFimContrato",
  label: "Fim de contrato",
  valor: (p) => formatDataBr(p.dataFimContrato),
};
const COLUNA_CONTRATO_FORMACAO: ColunaDef = {
  chave: "contratoFormacao",
  label: "Contrato de formação",
  valor: (p) => (p.contratoFormacao == null ? "—" : p.contratoFormacao ? "Sim" : "Não"),
};
const COLUNA_EMPRESARIO: ColunaDef = {
  chave: "empresarioNome",
  label: "Empresário",
  valor: (p) => p.empresarioNome ?? "—",
};
const COLUNA_STATUS: ColunaDef = { chave: "status", label: "Situação", valor: (p) => p.status ?? "—" };

/** Colunas que fazem sentido pra cada tipo de pessoa — cada `TabelaPessoas` só mostra, entre as
 * marcadas pelo usuário em `colunas`, as que estão nesta lista (ex.: Posição nunca aparece na
 * tabela de Comissão Técnica, mesmo que `colunas.posicao` esteja marcado). */
const COLUNAS_ATLETAS: ColunaDef[] = [
  COLUNA_APELIDO,
  COLUNA_NASCIMENTO,
  COLUNA_CPF,
  COLUNA_RG,
  COLUNA_TELEFONE,
  COLUNA_POSICAO,
  COLUNA_NUMERO_CAMISA,
  COLUNA_NUMERO_REGISTRO,
  COLUNA_PE_DOMINANTE,
  COLUNA_NATURALIDADE,
  COLUNA_ENDERECO,
  COLUNA_INICIO_CLUBE,
  COLUNA_TIPO_CONTRATO,
  COLUNA_FIM_CONTRATO,
  COLUNA_CONTRATO_FORMACAO,
  COLUNA_EMPRESARIO,
  COLUNA_STATUS,
  COLUNA_CATEGORIA,
];

const COLUNAS_COMISSAO: ColunaDef[] = [
  COLUNA_APELIDO,
  COLUNA_NASCIMENTO,
  COLUNA_CPF,
  COLUNA_RG,
  COLUNA_TELEFONE,
  COLUNA_EMAIL,
  COLUNA_FUNCAO,
  COLUNA_CATEGORIA,
];

const COLUNAS_STAFF: ColunaDef[] = [
  COLUNA_NASCIMENTO,
  COLUNA_CPF,
  COLUNA_RG,
  COLUNA_TELEFONE,
  COLUNA_EMAIL,
  COLUNA_FUNCAO,
  COLUNA_ENDERECO,
];

function TabelaPessoas({
  titulo,
  pessoas,
  colunas,
  colunasDisponiveis,
}: {
  titulo: string;
  pessoas: RelatorioAvulsoPessoa[];
  colunas: RelatorioAvulsoColunas;
  colunasDisponiveis: ColunaDef[];
}) {
  if (pessoas.length === 0) return null;

  // Mesmo com o piso de largura garantindo que cada coluna sempre tenha espaço suficiente pra não
  // vazar texto por cima da vizinha (ver `larguraColunas`), uma linha com muitas colunas ao mesmo
  // tempo (~12+) acaba mais larga que a página e o motor de layout do react-pdf começa a posicionar
  // as colunas mais à direita incorretamente. Por segurança, limita a no máximo
  // `LIMITE_COLUNAS_EXTRAS` colunas extras por tabela — o usuário ainda escolhe quais marcar, só que
  // além desse limite as últimas marcadas (na ordem em que aparecem no formulário) não aparecem
  // nesta tabela específica.
  const colunasAtivas = colunasDisponiveis.filter((c) => colunas[c.chave]).slice(0, LIMITE_COLUNAS_EXTRAS);
  const { nome: larguraNome, porColuna: largurasExtras } = larguraColunas(colunasAtivas);

  return (
    <View wrap={false}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.colNome, styles.headerCell, { width: larguraNome }]}>Nome completo</Text>
        {colunasAtivas.map((c, i) => (
          <Text key={c.chave} style={[styles.colExtra, styles.headerCell, { width: largurasExtras[i] }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {pessoas.map((p, i) => (
        <View style={styles.tableRow} key={i}>
          <Text style={[styles.colNome, styles.cellNome, { width: larguraNome }]}>{p.nome}</Text>
          {colunasAtivas.map((c, j) => (
            <Text key={c.chave} style={[styles.colExtra, styles.cell, { width: largurasExtras[j] }]}>
              {c.valor(p)}
            </Text>
          ))}
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
            <TabelaPessoas
              titulo="Atletas"
              pessoas={atletas}
              colunas={colunas}
              colunasDisponiveis={COLUNAS_ATLETAS}
            />
            <TabelaPessoas
              titulo="Comissão Técnica"
              pessoas={comissao}
              colunas={colunas}
              colunasDisponiveis={COLUNAS_COMISSAO}
            />
            <TabelaPessoas titulo="Staff" pessoas={staff} colunas={colunas} colunasDisponiveis={COLUNAS_STAFF} />
          </>
        )}

        <DocumentoFooter />
      </Page>
    </Document>
  );
}
