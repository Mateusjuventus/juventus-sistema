import type { Config } from "tailwindcss";
import { juventusTheme } from "./lib/theme";

const config: Config = {
  // "./lib/**/*.{ts,tsx}" entrou por causa de lib/futebol/categoria-posicao.ts, que monta classes
  // Tailwind (cor da tag de posição) fora de app/ ou components/ — sem isso, o scanner do
  // Tailwind não via essas classes e elas saíam do CSS final (JIT purga o que não referencia).
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        grena: {
          DEFAULT: juventusTheme.grena,
          escuro: juventusTheme.grenaEscuro,
        },
        dourado: juventusTheme.dourado,
        prata: juventusTheme.prata,
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
