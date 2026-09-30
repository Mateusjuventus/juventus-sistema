import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { DocumentoFooter, type LogoSrc } from "./logistica-shared";
import { CabecalhoExportacaoBanner, CORES_EXPORT } from "./programacao-export-shared";
import {
  montarLinhaMicrociclo,
  type MicrocicloData,
  type MicrocicloDia,
  type MicrocicloAtividade,
} from "@/lib/programacao/microciclo-data";
import type { ProgramacaoTurno } from "@/lib/supabase/types";

/**
 * Exportação em PDF do microciclo (ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-
 * layout-geral-design.md, Parte 2) — redesenhada pra seguir o modelo impresso que o clube já usa
 * (CA JUVENTUS SAF SUB-20, "MICROCICLO Nº21"): faixa grená com escudo + estrelas (sem brasão da
 * FPF, a pedido do Mateus), barra lateral única "MANHÃ"/"TARDE" (Tarde e Noite combinados num só
 * bloco visual — os dois turnos continuam existindo separados no banco), faixa de divisão entre os
 * dois períodos (mostra o local do Treino da manhã quando houver um — "Sede Social" — mas aparece
 * sempre, com ou sem local, ver mais abaixo), e cards de jogo com os dois escudos (Juventus ×
 * adversário). SEM bloco de assinatura, a pedido do Mateus (ver `DocumentoFooter`, já sem nome
 * algum).
 *
 * As alturas de Manhã/Tarde eram fixas (140/110) até 18/09 — quebrava pra qualquer categoria cuja
 * rotina real não bate com essa proporção (ex.: Sub-12/Sub-13 têm tudo de tarde: manhã sempre vazia
 * e uma pilha de 3 atividades espremida nos 110px fixos de tarde) e, pior, a coluna do dia inteira
 * esticava (`flex: 1`) pra ocupar todo o resto da página em branco, deixando uma área enorme e vazia
 * abaixo da tabela. A partir daqui as alturas de cada período são calculadas por semana a partir do
 * que realmente tem atividade nela (`alturaBlocoTurno` abaixo), a tabela para de esticar pra ocupar
 * a página toda (`corpoRow` sem `flex: 1`), e a divisão entre Manhã/Tarde (`divisorPeriodoBloco`)
 * passa a aparecer em todo dia com atividade, não só quando o treino da manhã tem local preenchido.
 */

const ALTURA_ITEM_ATIVIDADE = 30;
const ALTURA_ITEM_JOGO = 56;
const ALTURA_MINIMA_TURNO = 46;
const ALTURA_DIVISOR_PERIODO = 12;

function alturaAtividade(atividade: MicrocicloAtividade): number {
  return atividade.jogo ? ALTURA_ITEM_JOGO : ALTURA_ITEM_ATIVIDADE;
}

/** Soma a altura estimada das atividades de um turno (ou turnos combinados, caso de Tarde+Noite)
 * num dia — usada por `alturaBlocoTurno` abaixo pra achar o maior valor da semana inteira. */
function alturaAtividadesDoDia(dia: MicrocicloDia, turnos: ProgramacaoTurno[]): number {
  return turnos.reduce((soma, turno) => soma + dia.atividadesPorTurno[turno].reduce((s, a) => s + alturaAtividade(a), 0), 0);
}

/** Altura do bloco de Manhã (ou de Tarde, combinando Tarde+Noite) pra semana inteira — o maior valor
 * entre os dias com atividade, com um piso mínimo (`ALTURA_MINIMA_TURNO`) pra sempre caber o rótulo
 * "Descanso" centralizado com folga, mesmo numa semana em que aquele período fica sempre vazio. Os 7
 * dias usam a MESMA altura (não uma por dia) pra a divisão Manhã/Tarde ficar alinhada na mesma linha
 * em toda a tabela. */
function alturaBlocoTurno(dias: MicrocicloDia[], turnos: ProgramacaoTurno[]): number {
  const maiorConteudo = Math.max(0, ...dias.filter((d) => d.temAtividade).map((d) => alturaAtividadesDoDia(d, turnos)));
  return Math.max(ALTURA_MINIMA_TURNO, maiorConteudo + 8);
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 50, fontFamily: "Helvetica", fontSize: 8, color: "#262626" },
  corpoRow: { flexDirection: "row", marginTop: 8 },
  turnoSidebar: { width: 14, flexDirection: "column" },
  turnoSidebarManha: { alignItems: "center", justifyContent: "center" },
  turnoSidebarTarde: { alignItems: "center", justifyContent: "center" },
  turnoSidebarTexto: {
    fontSize: 7,
    fontWeight: 700,
    color: "#a3a3a3",
    textTransform: "uppercase",
    letterSpacing: 1,
    transform: "rotate(-90deg)",
  },
  grade: { flexDirection: "row", gap: 4, flex: 1 },
  coluna: { flex: 1, borderWidth: 0.75, borderColor: "#d4d4d4", borderRadius: 3, overflow: "hidden" },
  colunaHeader: {
    backgroundColor: CORES_EXPORT.cabecalho,
    paddingVertical: 5,
    alignItems: "center",
  },
  colunaHeaderDia: { fontSize: 7, fontWeight: 700, color: "#ffffff", letterSpacing: 0.3, textAlign: "center" },
  colunaHeaderData: { fontSize: 9, fontWeight: 700, color: "#ffffff", marginTop: 1, textAlign: "center" },
  folgaBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CORES_EXPORT.folgaBg,
  },
  folgaTexto: {
    fontSize: 8.5,
    fontWeight: 700,
    color: CORES_EXPORT.folgaText,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  manhaBloco: { padding: 4, alignItems: "center" },
  turnoVazioBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Divisão entre Manhã e Tarde — antes só existia quando o treino da manhã tinha local preenchido
  // (`sedeSocialBloco`), então num dia todo à tarde (ex.: Sub-12/Sub-13) não tinha divisor nenhum. A
  // partir de 18/09 sempre aparece pra todo dia com atividade; o texto do local só entra quando tem.
  divisorPeriodoBloco: {
    minHeight: ALTURA_DIVISOR_PERIODO,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  divisorPeriodoTexto: { fontSize: 6.5, fontWeight: 700, color: "#737373", textAlign: "center" },
  tardeBloco: { padding: 4, alignItems: "center" },
  atividadeBox: {
    alignSelf: "stretch",
    borderWidth: 0.75,
    borderColor: "#e5e5e5",
    borderRadius: 2,
    padding: 3,
    marginBottom: 3,
    alignItems: "center",
  },
  atividadeNome: { fontSize: 7.5, fontWeight: 700, textAlign: "center" },
  atividadeHorario: { fontSize: 6.5, marginTop: 0.5, textAlign: "center" },
  // "Descanso" (turno sem atividade dentro de um dia que tem outros compromissos) — vocabulário do
  // modelo de referência do Mateus ("PROGRAMAÇÃO SEMANAL SUB 20", 18/09), distinto de "Folga" (dia
  // inteiro livre, ver `folgaTexto` acima). Antes disso o turno vazio só mostrava um "—" apagado.
  turnoVazio: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#a3a3a3",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
  },
});

// `jogoBox` usa a cor grená de marca (não a navy da exportação genérica) — mantém o mesmo
// vocabulário visual já usado em todo o sistema pra "isto é um jogo" (grená = `CORES.grena`).
// `alignSelf: "stretch"` + `alignItems: "center"` pelo mesmo motivo de `atividadeBox`: os blocos de
// Manhã/Tarde centralizam os filhos por padrão agora, então sem isso o card encolheria pra caber só
// no conteúdo em vez de ocupar a largura inteira da coluna.
const jogoBoxStyle = {
  alignSelf: "stretch" as const,
  alignItems: "center" as const,
  borderRadius: 2,
  padding: 3,
  marginBottom: 3,
  backgroundColor: "#5C0A35",
};
const jogoStyles = StyleSheet.create({
  tag: { fontSize: 6, fontWeight: 700, color: "#F2D48B", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  escudosRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 2 },
  escudo: { width: 14, height: 14, objectFit: "contain" },
  escudoVazio: { width: 14, height: 14 },
  x: { fontSize: 6.5, fontWeight: 700, color: "#e5d4dd" },
  texto: { fontSize: 7, fontWeight: 700, color: "#ffffff", marginTop: 2, textAlign: "center" },
  detalhe: { fontSize: 6.5, color: "#e5d4dd", marginTop: 1, textAlign: "center" },
});

function CardJogo({ atividade, juventusLogoSrc }: { atividade: MicrocicloAtividade; juventusLogoSrc: LogoSrc }) {
  const jogo = atividade.jogo;
  if (!jogo) return null;

  const primeiro = jogo.mandante
    ? { src: juventusLogoSrc, nome: "Juventus" }
    : { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome };
  const segundo = jogo.mandante
    ? { src: jogo.adversarioLogoUrl, nome: jogo.adversario_nome }
    : { src: juventusLogoSrc, nome: "Juventus" };

  return (
    <View style={jogoBoxStyle}>
      <Text style={jogoStyles.tag}>{atividade.tipoLabel}</Text>
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
      <Text style={jogoStyles.texto}>
        {jogo.mandante ? "Juventus" : jogo.adversario_nome} × {jogo.mandante ? jogo.adversario_nome : "Juventus"}
      </Text>
      <Text style={jogoStyles.detalhe}>
        {atividade.horarioInicio}
        {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
      </Text>
    </View>
  );
}

function BlocoAtividade({ atividade }: { atividade: MicrocicloAtividade }) {
  return (
    <View style={[styles.atividadeBox, { backgroundColor: atividade.corBg }]}>
      <Text style={[styles.atividadeNome, { color: atividade.corText }]}>{atividade.nome}</Text>
      <Text style={[styles.atividadeHorario, { color: atividade.corText }]}>
        {atividade.horarioInicio}
        {atividade.horarioTermino ? `-${atividade.horarioTermino}` : ""}
        {atividade.local ? ` · ${atividade.local}` : ""}
      </Text>
    </View>
  );
}

export function MicrocicloDocument({
  dados,
  juventusLogoSrc,
}: {
  dados: MicrocicloData;
  juventusLogoSrc: LogoSrc;
}) {
  // Uma altura só por período pra semana inteira (não uma por dia/coluna) — é o que faz a faixa de
  // divisão Manhã/Tarde cair na mesma linha em todas as 7 colunas. Ver comentário de
  // `alturaBlocoTurno` acima pro motivo de ter deixado de ser um valor fixo.
  const alturaManha = alturaBlocoTurno(dados.dias, ["manha"]);
  const alturaTarde = alturaBlocoTurno(dados.dias, ["tarde", "noite"]);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <CabecalhoExportacaoBanner
          juventusLogoSrc={juventusLogoSrc}
          titulo={`CA Juventus SAF ${dados.categoriaLabel}`}
          subtitulo={[montarLinhaMicrociclo(dados.microcicloTexto, dados.epoca), dados.periodoTexto]
            .filter(Boolean)
            .join(" · ")}
        />

        <View style={styles.corpoRow}>
          <View style={styles.turnoSidebar}>
            <View style={[styles.turnoSidebarManha, { minHeight: alturaManha }]}>
              <Text style={styles.turnoSidebarTexto}>Manhã</Text>
            </View>
            <View style={[styles.turnoSidebarTarde, { minHeight: ALTURA_DIVISOR_PERIODO + alturaTarde }]}>
              <Text style={styles.turnoSidebarTexto}>Tarde</Text>
            </View>
          </View>

          <View style={styles.grade}>
            {dados.dias.map((dia) => {
              const sedeSocial = dia.atividadesPorTurno.manha.find((a) => a.tipo === "treinamento" && a.local)?.local;
              const atividadesTarde = [...dia.atividadesPorTurno.tarde, ...dia.atividadesPorTurno.noite];

              return (
                <View key={dia.data} style={styles.coluna}>
                  <View style={styles.colunaHeader}>
                    <Text style={styles.colunaHeaderDia}>{dia.diaSemana}</Text>
                    <Text style={styles.colunaHeaderData}>{dia.dataFmt}</Text>
                  </View>

                  {!dia.temAtividade ? (
                    // `minHeight` aqui é só uma rede de segurança pra uma semana em que NENHUM dia
                    // tem atividade (`alturaManha`/`alturaTarde` caem no piso mínimo nesse caso) — o
                    // `flex: 1` continua sendo o que realmente alinha a caixa de Folga com a altura
                    // de qualquer coluna com atividade na mesma semana.
                    <View style={[styles.folgaBox, { minHeight: alturaManha + ALTURA_DIVISOR_PERIODO + alturaTarde }]}>
                      <Text style={styles.folgaTexto}>Folga</Text>
                    </View>
                  ) : (
                    <>
                      <View style={[styles.manhaBloco, { minHeight: alturaManha }]}>
                        {dia.atividadesPorTurno.manha.length === 0 ? (
                          <View style={styles.turnoVazioBox}>
                            <Text style={styles.turnoVazio}>Descanso</Text>
                          </View>
                        ) : (
                          dia.atividadesPorTurno.manha.map((atividade) =>
                            atividade.jogo ? (
                              <CardJogo key={atividade.id} atividade={atividade} juventusLogoSrc={juventusLogoSrc} />
                            ) : (
                              <BlocoAtividade key={atividade.id} atividade={atividade} />
                            ),
                          )
                        )}
                      </View>

                      {/* Divisão entre os dois períodos — sempre aparece em todo dia com atividade
                          (antes só aparecia quando o treino da manhã tinha local preenchido, então um
                          dia todo à tarde ficava sem nenhum divisor). O texto do local do treino da
                          manhã (ex.: "Sede Social") só entra quando existir. */}
                      <View style={styles.divisorPeriodoBloco}>
                        {sedeSocial ? <Text style={styles.divisorPeriodoTexto}>{sedeSocial}</Text> : null}
                      </View>

                      <View style={[styles.tardeBloco, { minHeight: alturaTarde }]}>
                        {atividadesTarde.length === 0 ? (
                          <View style={styles.turnoVazioBox}>
                            <Text style={styles.turnoVazio}>Descanso</Text>
                          </View>
                        ) : (
                          atividadesTarde.map((atividade) =>
                            atividade.jogo ? (
                              <CardJogo key={atividade.id} atividade={atividade} juventusLogoSrc={juventusLogoSrc} />
                            ) : (
                              <BlocoAtividade key={atividade.id} atividade={atividade} />
                            ),
                          )
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <DocumentoFooter geradoEm={new Date()} />
      </Page>
    </Document>
  );
}
