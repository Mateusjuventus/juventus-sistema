import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Resolve o alias "@/..." (mesmo de tsconfig.json) pra imports de VALOR em runtime — sem isso, o
 * vitest só resolve esse alias pra `import type` (que é só apagado na compilação), e qualquer
 * import de valor via "@/..." falha com "Failed to load url @/...". Vários arquivos já existentes
 * contornavam isso usando import relativo (ver comentário em `lib/futebol/contrato.ts`); este
 * config resolve o problema de uma vez pra todo o projeto, sem precisar reescrever cada import.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // Os testes existentes usam o Juventus como clube de referência ("Juventus x Osasco"…). Fixar o
  // clube aqui deixa o resultado igual em qualquer máquina, mesmo com NEXT_PUBLIC_CLUBE=maringa no
  // ambiente (ver lib/clube e lib/clube/clube.test.ts, que cobre os dois clubes).
  test: {
    env: { NEXT_PUBLIC_CLUBE: "juventus" },
  },
});
