import type { Config } from "tailwindcss";
import { juventusTheme } from "./lib/theme";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
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
