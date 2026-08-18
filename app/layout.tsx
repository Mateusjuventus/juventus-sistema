import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Sem isto o celular renderiza a página como se a tela tivesse 980px e depois encolhe tudo — o
 * sistema abria "de longe", com texto ilegível, e era esse o motivo principal de não dar pra usar
 * no telefone. `maximumScale` NÃO é limitado de propósito: travar o zoom quebra a acessibilidade de
 * quem precisa aproximar.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// A fonte Inter é importada dentro de app/globals.css (@fontsource-variable/inter) — ver o
// comentário lá pra entender por que não usamos next/font/google aqui.

export const metadata: Metadata = {
  title: "Juventus - SAF",
  description: "Central de cadastros e operação do futebol profissional do Juventus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-pagina antialiased">{children}</body>
    </html>
  );
}
