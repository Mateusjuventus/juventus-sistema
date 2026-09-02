import React from "react";
import { Path, Svg, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES, type LogoSrc } from "./logistica-shared";
import { CORES_EXPORT } from "@/lib/programacao/cores-exportacao";

export { CORES_EXPORT, corExportacaoAtividade } from "@/lib/programacao/cores-exportacao";

/**
 * Banner compartilhado pela exportação da Programação Semanal por categoria (Parte 2,
 * `microciclo-document.tsx`) e pela Programação Geral (Parte 3, `programacao-geral-document.tsx`)
 * — ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-geral-design.md. A paleta
 * em si (`CORES_EXPORT`/`corExportacaoAtividade`, reexportadas acima) mora em
 * `lib/programacao/cores-exportacao.ts` — não depende de `@react-pdf/renderer`, então
 * `lib/programacao/microciclo-data.ts`/`programacao-geral-data.ts` podem usá-la sem puxar o PDF
 * inteiro como dependência transitiva.
 */

// Mesmo desenho de estrela (SVG, não o caractere "★" — Helvetica não tem esse glifo) já usado em
// lib/pdf/poster-shared.tsx — reaproveitado aqui em vez de importado porque esse componente lá é
// privado (não exportado) e os dois documentos de pôster não têm nenhuma outra razão pra depender
// um do outro.
function Estrela({ cor, tamanho = 9 }: { cor: string; tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      <Path
        fill={cor}
        d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.27l-6.18 3.24L7 13.63l-5-4.87 6.91-1L12 1.5z"
      />
    </Svg>
  );
}

const bannerStyles = StyleSheet.create({
  faixa: {
    backgroundColor: CORES_EXPORT.cabecalho,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 3,
  },
  escudoCol: { width: 60, alignItems: "center" },
  estrelas: { flexDirection: "row", gap: 4, marginBottom: 3 },
  escudo: { width: 32, height: 32, objectFit: "contain" },
  tituloCol: { flex: 1, alignItems: "center" },
  titulo: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitulo: { fontSize: 8.5, color: "#dbe3ee", marginTop: 2, textAlign: "center" },
  spacerCol: { width: 60 },
});

/**
 * Faixa grená do topo, comum aos documentos da exportação (Programação Semanal por categoria e
 * Programação Geral): escudo do Juventus + duas estrelinhas à esquerda, título centralizado em
 * branco — SEM o brasão da FPF (pedido explícito do Mateus: "não precido do FPF"). Uma coluna vazia
 * do mesmo tamanho do escudo do lado direito garante que o título fique realmente centralizado na
 * página, não só no espaço que sobra depois do escudo.
 */
export function CabecalhoExportacaoBanner({
  juventusLogoSrc,
  titulo,
  subtitulo,
}: {
  juventusLogoSrc: LogoSrc;
  titulo: string;
  subtitulo?: string | null;
}) {
  return (
    <View style={bannerStyles.faixa}>
      <View style={bannerStyles.escudoCol}>
        <View style={bannerStyles.estrelas}>
          <Estrela cor="#B9B9B9" />
          <Estrela cor={CORES.dourado} />
        </View>
        {juventusLogoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={bannerStyles.escudo} src={juventusLogoSrc as string} />
        ) : null}
      </View>
      <View style={bannerStyles.tituloCol}>
        <Text style={bannerStyles.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={bannerStyles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      <View style={bannerStyles.spacerCol} />
    </View>
  );
}
