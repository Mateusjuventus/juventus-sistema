import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // `tsconfig.json` usa `"jsx": "preserve"` (o SWC do Next.js resolve o runtime automático de
  // JSX na build de verdade) — sem isso aqui, o esbuild do Vite cai no transform clássico, que
  // exige `React` no escopo. Nenhum dos componentes de documento PDF (`lib/pdf/*.tsx`) importa
  // `React` (seguem o mesmo padrão do resto do projeto, só os named exports de
  // `@react-pdf/renderer`) — primeiro teste a precisar renderizar JSX de verdade foi
  // `parecer-social-document.test.ts`, daí essa configuração só ter aparecido agora.
  esbuild: {
    jsx: "automatic",
  },
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
