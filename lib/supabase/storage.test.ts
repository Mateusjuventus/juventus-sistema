import { describe, expect, it } from "vitest";
import { buildCaptacaoDocumentoPath } from "./storage";

describe("buildCaptacaoDocumentoPath", () => {
  it("monta o path como <captacao_id>/<tipo>.<extensão>", () => {
    expect(buildCaptacaoDocumentoPath("cand-1", "rg_atleta", "foto.jpg")).toBe("cand-1/rg_atleta.jpg");
    expect(buildCaptacaoDocumentoPath("cand-1", "atestado_medico", "atestado.pdf")).toBe(
      "cand-1/atestado_medico.pdf",
    );
  });

  it("usa o tipo como nome fixo do arquivo — reenviar o mesmo tipo gera sempre o mesmo path (upsert)", () => {
    const primeiroEnvio = buildCaptacaoDocumentoPath("cand-1", "eletrocardiograma", "exame-de-hoje.pdf");
    const reenvio = buildCaptacaoDocumentoPath("cand-1", "eletrocardiograma", "outro-nome-de-arquivo.pdf");
    expect(primeiroEnvio).toBe(reenvio);
  });

  it("cai pra .pdf quando o nome do arquivo não tem extensão reconhecível", () => {
    expect(buildCaptacaoDocumentoPath("cand-1", "declaracao_escolar", "arquivo-sem-extensao")).toBe(
      "cand-1/declaracao_escolar.pdf",
    );
  });

  it("normaliza a extensão pra minúscula", () => {
    expect(buildCaptacaoDocumentoPath("cand-1", "rg_responsavel", "FOTO.PNG")).toBe("cand-1/rg_responsavel.png");
  });
});
