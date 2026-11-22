import { clube } from "@/lib/clube";

/**
 * Escudo do clube desta instância (ver lib/clube). Os arquivos ficam em `public/brand/`.
 * `sobre="escuro"` usa a versão para fundo escuro (sidebar, cabeçalhos cheios, páginas públicas
 * em grená/verde) — no Juventus é o mesmo brasão; no Maringá, o escudo branco oficial.
 *
 * Os mesmos arquivos estáticos (sem depender do Supabase Storage) são usados nos documentos
 * oficiais, com a regra de posicionamento: jogo em casa, escudo do clube primeiro (esquerda);
 * jogo fora, depois do escudo do mandante (direita).
 */
type Props = { className?: string; sobre?: "claro" | "escuro" };

export function ClubeEscudo({ className, sobre = "claro" }: Props) {
  const src = sobre === "escuro" ? clube.escudo.completoSobreEscuro : clube.escudo.completo;
  return <img src={src} alt={clube.escudo.alt} className={className} style={{ objectFit: "contain" }} />;
}

/** Versão compacta do escudo — cabeçalho, badges inline. */
export function ClubeEscudoMark({ className, sobre = "claro" }: Props) {
  const src = sobre === "escuro" ? clube.escudo.markSobreEscuro : clube.escudo.mark;
  return <img src={src} alt={clube.escudo.alt} className={className} style={{ objectFit: "contain" }} />;
}
