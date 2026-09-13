import { describe, expect, it } from "vitest";
import { resolverNomeCargoParaAssinatura } from "./nome-cargo";

/**
 * Fake mínimo do client do Supabase, só o suficiente pra simular
 * `.from(tabela).select(...).eq("id", id).maybeSingle()` — nenhum teste deste projeto até agora
 * precisava simular uma cadeia do Supabase (as outras regras de permissão são testadas como função
 * pura, ver `lib/auth/role.test.ts`), mas `resolverNomeCargoParaAssinatura` de fato busca em duas
 * tabelas diferentes conforme o vínculo, então precisa de verdade de um client simulado.
 */
function fakeSupabase(registros: {
  comissao_tecnica?: Record<string, { nome_completo: string; funcao: string }>;
  comissao_tecnica_base?: Record<string, { nome_completo: string; funcao: string }>;
}) {
  return {
    from(tabela: "comissao_tecnica" | "comissao_tecnica_base") {
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                async maybeSingle() {
                  const tabelaRegistros = registros[tabela] ?? {};
                  return { data: tabelaRegistros[id] ?? null };
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
  it("sem nenhum vínculo, usa nome/cargo de perfis", async () => {
    const supabase = fakeSupabase({});
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: "Mateus dos Santos",
      cargo: "Supervisor de Futebol",
      comissao_tecnica_id: null,
      comissao_tecnica_base_id: null,
    });
    expect(resultado).toEqual({ nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" });
  });

  it("vinculado só ao Profissional, usa nome/função de comissao_tecnica", async () => {
    const supabase = fakeSupabase({
      comissao_tecnica: { "ct-1": { nome_completo: "Pedro Machado", funcao: "Gerente de Futebol" } },
    });
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: "Nome antigo em perfis",
      cargo: "Cargo antigo",
      comissao_tecnica_id: "ct-1",
      comissao_tecnica_base_id: null,
    });
    expect(resultado).toEqual({ nome: "Pedro Machado", cargo: "Gerente de Futebol" });
  });

  it("vinculado só à Base, usa nome/função de comissao_tecnica_base", async () => {
    const supabase = fakeSupabase({
      comissao_tecnica_base: { "ctb-1": { nome_completo: "Ana Souza", funcao: "Supervisora Sub-11 a Sub-14" } },
    });
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: null,
      cargo: null,
      comissao_tecnica_id: null,
      comissao_tecnica_base_id: "ctb-1",
    });
    expect(resultado).toEqual({ nome: "Ana Souza", cargo: "Supervisora Sub-11 a Sub-14" });
  });

  it("os dois vínculos preenchidos ao mesmo tempo — o da Base tem prioridade", async () => {
    const supabase = fakeSupabase({
      comissao_tecnica: { "ct-1": { nome_completo: "Pedro Machado", funcao: "Gerente de Futebol" } },
      comissao_tecnica_base: { "ctb-1": { nome_completo: "Ana Souza", funcao: "Supervisora Sub-11 a Sub-14" } },
    });
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: null,
      cargo: null,
      comissao_tecnica_id: "ct-1",
      comissao_tecnica_base_id: "ctb-1",
    });
    expect(resultado).toEqual({ nome: "Ana Souza", cargo: "Supervisora Sub-11 a Sub-14" });
  });

  it("comissao_tecnica_base_id preenchido mas o registro não existe mais — cai pra perfis.nome/cargo", async () => {
    const supabase = fakeSupabase({});
    const resultado = await resolverNomeCargoParaAssinatura(supabase, {
      nome: "Mateus dos Santos",
      cargo: "Supervisor de Futebol",
      comissao_tecnica_id: null,
      comissao_tecnica_base_id: "ctb-excluido",
    });
    expect(resultado).toEqual({ nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" });
  });
});
