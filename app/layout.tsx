import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juventus - SAF",
  description: "Central de cadastros e operação do futebol profissional do Juventus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
