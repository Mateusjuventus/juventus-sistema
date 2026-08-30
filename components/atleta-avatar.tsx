import { corAvatar, iniciaisNome } from "@/lib/futebol/avatar-cor";

type AtletaAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  className?: string;
};

/**
 * Retrato de um atleta/candidato — foto real quando cadastrada, senão um avatar de iniciais em cor
 * sólida (ver `lib/futebol/avatar-cor.ts`). Duas variantes de formato, mesmo par foto-ou-iniciais
 * por trás das duas: `Circulo` pra listas compactas (Convocação, "Meus Atletas"), `Bloco` pro
 * retrato grande no topo de um card de grade (candidatos da Captação, "Meus Atletas" em grade).
 */
export function AtletaAvatarCirculo({ nome, fotoUrl, className = "h-10 w-10" }: AtletaAvatarProps) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome}
        className={`${className} shrink-0 rounded-full border border-neutral-200 object-cover`}
      />
    );
  }
  const cor = corAvatar(nome);
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full ${cor.bg} ${cor.texto} text-xs font-bold`}
    >
      {iniciaisNome(nome)}
    </div>
  );
}

export function AtletaAvatarBloco({ nome, fotoUrl, className = "aspect-square w-full" }: AtletaAvatarProps) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fotoUrl} alt={nome} className={`${className} rounded-t-lg object-cover`} />
    );
  }
  const cor = corAvatar(nome);
  return (
    <div
      className={`${className} flex items-center justify-center rounded-t-lg ${cor.bg} ${cor.texto} text-3xl font-extrabold`}
    >
      {iniciaisNome(nome)}
    </div>
  );
}
