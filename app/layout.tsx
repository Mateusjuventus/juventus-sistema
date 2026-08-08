import type { Metadata } from "next";
import "./globals.css";

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
