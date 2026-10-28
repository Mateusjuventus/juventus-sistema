import { describe, expect, it } from "vitest";
import { resolverNomeCargoParaAssinatura, treinadorPossuiVinculoObrigatorio } from "./nome-cargo";

/**
 * Fake mínimo do client do Supabase, só o suficiente pra simular
 * `.from("comissao_tecnica").select(...).eq("id", id).maybeSingle()` — nenhum teste deste projeto
 * até agora precisava simular uma cadeia do Supabase (as outras regras de permissão são testadas
 * como função pura, ver `lib/auth/role.test.ts`), mas `resolverNomeCargoParaAssinatura` de fato
 * busca na tabela conforme o vínculo, então precisa de verdade de um client simulado.
 */
function fakeSupabase(registros: Record<string, { nome_completo: string; funcao: string }>) {
  return {
    from(_tabela: "comissao_tecnica") {
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                async maybeSingle() {
                  return { data: registros[id] ?? null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof resolverNomeCargoParaAssinatura>[0];
}

describe("resolverNomeCargoParaAssinatura", () => {
  it("sem vínculo, usa nome/cargo de perfis", async () => {
    const supabase = fakeSupabase({});
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: "Mateus dos Santos",
      cargo: "Supervisor de Futebol",
      comissao_tecnica_id: null,
    });
    expect(resultado).toEqual({ nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" });
  });

  it("vinculado, usa nome/função de comissao_tecnica (cobre Profissional e Base desde a unificação)", async () => {
    const supabase = fakeSupabase({
      "ct-1": { nome_completo: "Pedro Machado", funcao: "Gerente de Futebol" },
    });
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: "Nome antigo em perfis",
      cargo: "Cargo antigo",
      comissao_tecnica_id: "ct-1",
    });
    expect(resultado).toEqual({ nome: "Pedro Machado", cargo: "Gerente de Futebol" });
  });

  it("vinculado mas o registro não existe mais — cai pra perfis.nome/cargo", async () => {
    const supabase = fakeSupabase({});
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: "Mateus dos Santos",
      cargo: "Supervisor de Futebol",
      comissao_tecnica_id: "ct-excluido",
    });
    expect(resultado).toEqual({ nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" });
  });
});

describe("treinadorPossuiVinculoObrigatorio", () => {
  it("sem vínculo (conta de Treinador criada antes da trava obrigatória), devolve false", () => {
    expect(treinadorPossuiVinculoObrigatorio({ comissao_tecnica_id: null })).toBe(false);
  });

  it("com vínculo, devolve true", () => {
    expect(treinadorPossuiVinculoObrigatorio({ comissao_tecnica_id: "ct-1" })).toBe(true);
  });
});
