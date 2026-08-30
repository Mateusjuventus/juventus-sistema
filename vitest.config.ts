import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // Mesmo alias `@/*` -> raiz do projeto de `tsconfig.json` — até agora nenhum arquivo testado
    // importava algo de outro módulo via `@/` como valor de verdade (só `import type`, que o Vite
    // já apaga no transform, sem precisar resolver), então essa configuração nunca tinha feito
    // falta. `lib/programacao/permissoes.ts` é o primeiro caso (importa `getPerfilPermissoes` de
    // `@/lib/auth/role`), daí o alias precisar existir de verdade aqui também.
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
  },
});
