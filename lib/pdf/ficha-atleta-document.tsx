import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, DocumentoFooter, sharedStyles, type LogoSrc } from "./logistica-shared";

/**
 * Ficha individual do atleta em PDF — cabeçalho (foto, nome, posição) + os campos marcados no modal
 * de geração (`components/atletas/ficha-atleta-modal.tsx`), organizados nas mesmas 3 seções da tela
 * "Ver atleta" (Dados Pessoais / Dados Esportivos / Dados do Contrato). Pedido do Mateus em
 * 2026-10-22: "gerar a ficha do atleta" com "a opção de eu selecionar quais dados que eu quero que
 * apareça" — a seleção é por campo, mas a exibição continua agrupada por seção.
 *
 * O componente é "burro" de propósito: só recebe `secoes` já filtradas e formatadas pela rota
 * (`app/atletas/[id]/ficha/pdf/route.tsx` e `app/base/atletas/[categoria]/[id]/ficha/pdf/
 * route.tsx`) — a lógica de quais campos existem, como formatar cada um e como calcular o contrato
 * vigente fica nas rotas (uma pra Profissional, outra pra Base, com campos ligeiramente diferentes),
 * não aqui.
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
});

function DadoItem({ label, valor }: { label: string; valor: string | null }) {
  return (
    <View style={styles.dadoItem}>
      <Text style={styles.dadoLabel}>{label}</Text>
      <Text style={styles.dadoValor}>{valor ?? "—"}</Text>
    </View>
  );
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
}: {
  juventusLogoSrc: LogoSrc;
  fotoSrc: LogoSrc;
  nome: string;
  subtitulo: string;
  secoes: FichaAtletaSecao[];
}) {
  const algumaSecaoComConteudo = secoes.some((s) => s.dados === null || s.dados.length > 0);

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

        {!algumaSecaoComConteudo ? (
          <Text style={styles.avisoGeral}>Nenhum dado selecionado para esta ficha.</Text>
        ) : null}

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
