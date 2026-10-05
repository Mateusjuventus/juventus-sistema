import { describe, expect, it } from "vitest";
import { demandaSchema, demandaStatusSchema } from "./schemas";

describe("demandaSchema", () => {
  it("aceita título sozinho (descrição e prazo são opcionais)", () => {
    const resultado = demandaSchema.safeParse({ titulo: "Falar com a família do atleta" });
    expect(resultado.success).toBe(true);
  });

  it("aceita os três campos preenchidos", () => {
    const resultado = demandaSchema.safeParse({
      titulo: "Enviar relatório",
      descricao: "Relatório mensal pro Mateus",
      prazo: "2026-10-10",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita título vazio", () => {
    const resultado = demandaSchema.safeParse({ titulo: "" });
    expect(resultado.success).toBe(false);
  });
});

describe("demandaStatusSchema", () => {
  it("aceita os 3 status válidos", () => {
    for (const status of ["pendente", "em_andamento", "concluido"]) {
      expect(demandaStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejeita 'solicitado' — esse status é só de Tarefas, não existe em Demandas", () => {
    expect(demandaStatusSchema.safeParse({ status: "solicitado" }).success).toBe(false);
  });
});
