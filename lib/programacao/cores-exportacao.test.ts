import { describe, expect, it } from "vitest";
import { corExportacaoAtividade } from "./cores-exportacao";
import { corHexAtividade } from "./tipo-atividade";

describe("corExportacaoAtividade", () => {
  it("apresentacao/cafe_manha/video/academia/treinamento usam a paleta da exportação, não a da grade em tela", () => {
    expect(corExportacaoAtividade("apresentacao")).toEqual({ bg: "#2B5F99", text: "#FFFFFF" });
    expect(corExportacaoAtividade("cafe_manha")).toEqual({ bg: "#4A90D9", text: "#FFFFFF" });
    expect(corExportacaoAtividade("video")).toEqual({ bg: "#8EE685", text: "#1F1F1F" });
    expect(corExportacaoAtividade("academia")).toEqual({ bg: "#FDE68A", text: "#1F1F1F" });
    expect(corExportacaoAtividade("treinamento")).toEqual({ bg: "#FFFFFF", text: "#1F1F1F" });
    // Nenhuma delas deve coincidir com a cor da grade em tela (paletas independentes).
    expect(corExportacaoAtividade("academia")).not.toEqual(corHexAtividade("academia"));
  });

  it("os 6 tipos sem exemplo no modelo impresso caem no fallback de corHexAtividade", () => {
    for (const tipo of ["programacao", "refeicao", "transporte", "jogo_treino", "imprensa", "regenerativo"] as const) {
      expect(corExportacaoAtividade(tipo)).toEqual(corHexAtividade(tipo));
    }
  });
});
