import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Ficha individual da Comissão Técnica/Diretoria em PDF — pedido do Mateus em 14/11/2026 (item 8,
 * ponto 5): "mirroring the athlete's pattern". Mesma estrutura visual de `ficha-atleta-document.tsx`
 * (cabeçalho com foto/escudo/nome + seções com grade de DadoItem), mas bem mais simples: sem
 * seleção de campos via modal, sem Dados de Jogo/Anotações/Histórico de Desativações — a Comissão
 * Técnica não tem nada disso. A rota (`app/comissao-tecnica/[id]/ficha/pdf/route.tsx`) já manda a
 * lista de seções fixa e completa.
 */

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
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
});

function DadoItem({ label, valor }: { label: string; valor: string | null }) {
  return (
    <View style={styles.dadoItem}>
      <Text style={styles.dadoLabel}>{label}</Text>
      <Text style={styles.dadoValor}>{valor ?? "—"}</Text>
    </View>
  );
}

export interface FichaComissaoSecao {
  titulo: string;
  /** `null` quando a seção não se aplica a esta pessoa (ex.: "Dados de pagamento (PJ)" pra quem é
   * CLT) — mostra `avisoVazio` no lugar da grade em vez de simplesmente não aparecer, pra deixar
   * claro que não é um esquecimento. */
  dados: { label: string; valor: string | null }[] | null;
  avisoVazio?: string;
}

export function FichaComissaoDocument({
  juventusLogoSrc,
  fotoSrc,
  nome,
  subtitulo,
  secoes,
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  nome: string;
  subtitulo: string;
  secoes: FichaComissaoSecao[];
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
            <Text style={styles.tituloDocumento}>Ficha Individual — Comissão Técnica/Diretoria</Text>
            <Text style={styles.nome}>{nome}</Text>
            <Text style={styles.subtitulo}>{subtitulo}</Text>
          </View>
        </View>

        {secoes.map((secao) => (
          <View key={secao.titulo}>
            <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
            {secao.dados === null ? (
              <Text style={styles.avisoSecao}>{secao.avisoVazio ?? "Não se aplica."}</Text>
            ) : (
              <View style={styles.dadosGrid}>
                {secao.dados.map((d) => (
                  <DadoItem key={d.label} label={d.label} valor={d.valor} />
                ))}
              </View>
            )}
          </View>
        ))}

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
