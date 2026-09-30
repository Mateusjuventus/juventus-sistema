import React from "react";
import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { LogoSrc } from "./logistica-shared";
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

const bannerStyles = StyleSheet.create({
  faixa: {
    backgroundColor: CORES_EXPORT.cabecalho,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 3,
  },
  escudoCol: { width: 60, alignItems: "center" },
  // Proporção 773:1008 do brasão completo (já traz as duas estrelas) — ver public/brand/juventus-
  // escudo.png e a mesma observação em lib/pdf/poster-shared.tsx.
  escudo: { width: 30, height: 39, objectFit: "contain" },
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
