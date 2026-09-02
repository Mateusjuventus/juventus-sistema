import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { LogoSrc } from "./logistica-shared";
import { CabecalhoExportacaoBanner, CORES_EXPORT } from "./programacao-export-shared";
import type { MicrocicloAtividade } from "@/lib/programacao/microciclo-data";
import type { ProgramacaoGeralData, ProgramacaoGeralCategoria } from "@/lib/programacao/programacao-geral-data";

/**
 * Programação Geral — todas as 7 categorias compiladas num único documento PDF de página única (ver
 * docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-geral-design.md, Parte 3),
 * seguindo o modelo enviado pelo Mateus (Programação Geral.pdf): faixas pretas de divisor por
 * categoria, na ordem Sub-20 → Sub-11; grupo de turno só aparece quando a categoria tem ao menos
 * uma atividade nele naquela semana (ver `manhaVisivel`/`tardeVisivel` em `programacao-geral-
 * data.ts`); categoria sem nenhuma atividade na semana inteira vira uma única linha "DESCANSO".
 *
 * Página de tamanho CALCULADO (não "A4" fixo) — mesma técnica de `lib/pdf/organograma-base-
 * document.tsx` (único outro precedente no projeto de `Page size={[largura, altura]}` computado),
 * mas sem piso mínimo de tamanho padrão: a spec pede "compila... numa única página", ou seja, do
 * tamanho que o conteúdo real da semana pedir, não tentando caber num papel padrão. Alturas fixas
 * abaixo são estimativa inicial de engenharia — ajustar visualmente contra o PDF de referência do
 * Mateus antes de considerar pronto.
 */

const LARGURA_PAGINA_GERAL = 595; // pt, largura de A4 retrato — mesma proporção do modelo enviado
const PADDING_TOPO = 24;
const PADDING_BASE = 30;
const ALTURA_BANNER = 62;
const ESPACO_APOS_BANNER = 8;
const ALTURA_DIAS_HEADER = 24;
const ALTURA_DIVISOR_CATEGORIA = 16;
const ALTURA_ROTULO_TURNO = 10;
const ALTURA_LINHA_TURNO = 48;
const ALTURA_LINHA_DESCANSO = 18;
const ESPACO_ENTRE_CATEGORIAS = 4;

/** Pura — soma a altura necessária a partir dos dados reais da semana, ANTES do render (ver
 * `programacao-geral-document.test.ts`). */
export function calcularAlturaProgramacaoGeral(categorias: ProgramacaoGeralCategoria[]): number {
  let altura = PADDING_TOPO + PADDING_BASE + ALTURA_BANNER + ESPACO_APOS_BANNER + ALTURA_DIAS_HEADER;
  for (const cat of categorias) {
    altura += ALTURA_DIVISOR_CATEGORIA;
    if (!cat.temAtividadeNaSemana) {
      altura += ALTURA_LINHA_DESCANSO;
    } else {
      if (cat.manhaVisivel) altura += ALTURA_ROTULO_TURNO + ALTURA_LINHA_TURNO;
      if (cat.tardeVisivel) altura += ALTURA_ROTULO_TURNO + ALTURA_LINHA_TURNO;
    }
    altura += ESPACO_ENTRE_CATEGORIAS;
  }
  return altura;
}

const styles = StyleSheet.create({
  page: { padding: PADDING_TOPO, paddingBottom: PADDING_BASE, fontFamily: "Helvetica", fontSize: 6.5, color: "#262626" },
  diasHeaderRow: { flexDirection: "row", gap: 3, marginTop: ESPACO_APOS_BANNER, height: ALTURA_DIAS_HEADER },
  diaHeaderCel: {
    flex: 1,
    backgroundColor: CORES_EXPORT.cabecalho,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  diaHeaderDia: { fontSize: 6, fontWeight: 700, color: "#ffffff", letterSpacing: 0.3 },
  diaHeaderData: { fontSize: 7.5, fontWeight: 700, color: "#ffffff", marginTop: 1 },
  divisorCategoria: {
    height: ALTURA_DIVISOR_CATEGORIA,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: ESPACO_ENTRE_CATEGORIAS,
  },
  divisorTexto: { fontSize: 7.5, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: 1 },
  descansoLinha: {
    height: ALTURA_LINHA_DESCANSO,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CORES_EXPORT.folgaBg,
  },
  descansoTexto: {
    fontSize: 7,
    fontWeight: 700,
    color: CORES_EXPORT.folgaText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rotuloTurno: {
    height: ALTURA_ROTULO_TURNO,
    fontSize: 5.5,
    fontWeight: 700,
    color: "#a3a3a3",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linhaTurno: { flexDirection: "row", gap: 3, height: ALTURA_LINHA_TURNO },
  celulaDia: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 2,
    padding: 2,
    overflow: "hidden",
  },
  celulaVazia: { flex: 1, alignItems: "center", justifyContent: "center" },
  celulaVaziaTexto: { fontSize: 6, color: "#d4d4d4" },
  atividadeBox: { borderRadius: 2, padding: 2, marginBottom: 2 },
  atividadeNome: { fontSize: 5.8, fontWeight: 700 },
  atividadeHorario: { fontSize: 5, marginTop: 0.5 },
});

const jogoBoxStyle = { borderRadius: 2, padding: 2, marginBottom: 2, backgroundColor: "#5C0A35" };
const jogoStyles = StyleSheet.create({
  escudosRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  escudo: { width: 9, height: 9, objectFit: "contain" },
  escudoVazio: { width: 9, height: 9 },
  x: { fontSize: 5, fontWeight: 700, color: "#e5d4dd" },
  texto: { fontSize: 5.2, fontWeight: 700, color: "#ffffff", marginTop: 1 },
  horario: { fontSize: 5, color: "#e5d4dd", marginTop: 0.5 },
});

function CelulaAtividades({
  atividades,
  juventusLogoSrc,
}: {
  atividades: MicrocicloAtividade[];
  juventusLogoSrc: LogoSrc;
}) {
  if (atividades.length === 0) {
    return (
      <View style={styles.celulaDia}>
        <View style={styles.celulaVazia}>
          <Text style={styles.celulaVaziaTexto}>—</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.celulaDia}>
      {atividades.map((atividade) => {
        if (atividade.jogo) {
          const jogo = atividade.jogo;
          const primeiro = jogo.mandante
            ? { src: juventusLogoSrc, nome: "Juventus" }
            : { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome };
          const segundo = jogo.mandante
            ? { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome }
            : { src: juventusLogoSrc, nome: "Juventus" };
          return (
            <View key={atividade.id} style={jogoBoxStyle}>
              <View style={jogoStyles.escudosRow}>
                {primeiro.src ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image style={jogoStyles.escudo} src={primeiro.src as string} />
                ) : (
                  <View style={jogoStyles.escudoVazio} />
                )}
                <Text style={jogoStyles.x}>×</Text>
                {segundo.src ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image style={jogoStyles.escudo} src={segundo.src as string} />
                ) : (
                  <View style={jogoStyles.escudoVazio} />
                )}
              </View>
              <Text style={jogoStyles.texto}>{atividade.tipoLabel}</Text>
              <Text style={jogoStyles.horario}>{atividade.horarioInicio}</Text>
            </View>
          );
        }
        return (
          <View key={atividade.id} style={[styles.atividadeBox, { backgroundColor: atividade.corBg }]}>
            <Text style={[styles.atividadeNome, { color: atividade.corText }]}>{atividade.nome}</Text>
            <Text style={[styles.atividadeHorario, { color: atividade.corText }]}>{atividade.horarioInicio}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ProgramacaoGeralDocument({
  dados,
  juventusLogoSrc,
}: {
  dados: ProgramacaoGeralData;
  juventusLogoSrc: LogoSrc;
}) {
  const alturaPagina = calcularAlturaProgramacaoGeral(dados.categorias);

  return (
    <Document>
      <Page size={[LARGURA_PAGINA_GERAL, alturaPagina]} style={styles.page}>
        <CabecalhoExportacaoBanner
          juventusLogoSrc={juventusLogoSrc}
          titulo={`Programação Semanal — ${dados.periodoTexto}`}
        />

        <View style={styles.diasHeaderRow}>
          {dados.categorias[0]?.dias.map((dia) => (
            <View key={dia.data} style={styles.diaHeaderCel}>
              <Text style={styles.diaHeaderDia}>{dia.diaSemana}</Text>
              <Text style={styles.diaHeaderData}>{dia.dataFmt}</Text>
            </View>
          ))}
        </View>

        {dados.categorias.map((cat) => (
          <View key={cat.categoria}>
            <View style={styles.divisorCategoria}>
              <Text style={styles.divisorTexto}>{cat.categoriaLabel}</Text>
            </View>

            {!cat.temAtividadeNaSemana ? (
              <View style={styles.descansoLinha}>
                <Text style={styles.descansoTexto}>Descanso</Text>
              </View>
            ) : (
              <>
                {cat.manhaVisivel ? (
                  <>
                    <Text style={styles.rotuloTurno}>Manhã</Text>
                    <View style={styles.linhaTurno}>
                      {cat.dias.map((dia) => (
                        <CelulaAtividades
                          key={dia.data}
                          atividades={dia.atividadesPorTurno.manha}
                          juventusLogoSrc={juventusLogoSrc}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
                {cat.tardeVisivel ? (
                  <>
                    <Text style={styles.rotuloTurno}>Tarde</Text>
                    <View style={styles.linhaTurno}>
                      {cat.dias.map((dia) => (
                        <CelulaAtividades
                          key={dia.data}
                          atividades={[...dia.atividadesPorTurno.tarde, ...dia.atividadesPorTurno.noite]}
                          juventusLogoSrc={juventusLogoSrc}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
