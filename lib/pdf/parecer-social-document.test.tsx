import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { ParecerSocialDocument } from "./parecer-social-document";

/**
 * Teste de render (não só de uma função pura auxiliar, já que este documento não precisou de
 * nenhuma, diferente de `relatorio-dispensa-document.test.ts`/`parecer-final-document.test.ts`) —
 * garante que o PDF do Parecer Social não quebra com dados de exemplo, incluindo o caso sem
 * nenhum atendimento ainda registrado (atleta recém-chegado ao módulo). Extensão `.tsx` (único
 * teste do projeto que precisa disso) porque passar a JSX pro `renderToBuffer` tipa certinho —
 * via `React.createElement` explícito, o TypeScript enxerga os props do componente em vez de
 * `DocumentProps` que o `<Document>` interno espera.
 */
describe("ParecerSocialDocument", () => {
  it("renderiza sem erro com histórico de atendimentos e assinatura já feita", async () => {
    const buffer = await renderToBuffer(
      <ParecerSocialDocument
        juventusLogoSrc={null}
        fotoSrc={null}
        atleta={{ nome: "João da Silva", dataNascimento: "2010-05-12", categoria: "Sub-15" }}
        atendimentos={[
          { data: "2026-09-01", anotacoes: "Conversa inicial com a família.", encaminhamento: null },
          { data: "2026-09-15", anotacoes: "Acompanhamento escolar.", encaminhamento: "Psicólogo do clube" },
        ]}
        assinatura={{
          nome: "Maria Assistente",
          cargo: "Assistente Social",
          assinadoEm: "2026-09-15T10:00:00Z",
          assinaturaImagemSrc: null,
        }}
        emitidoEm={new Date("2026-09-15T12:00:00Z")}
      />,
    );
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("renderiza sem erro sem nenhum atendimento e sem assinatura (caso pendente)", async () => {
    const buffer = await renderToBuffer(
      <ParecerSocialDocument
        juventusLogoSrc={null}
        fotoSrc={null}
        atleta={{ nome: "João da Silva", dataNascimento: null, categoria: null }}
        atendimentos={[]}
        assinatura={null}
        emitidoEm={new Date("2026-09-15T12:00:00Z")}
      />,
    );
    expect(buffer.length).toBeGreaterThan(0);
  });
});
