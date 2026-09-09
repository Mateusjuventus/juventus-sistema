import { corAvatar, iniciaisNome } from "@/lib/futebol/avatar-cor";

type AtletaAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  className?: string;
};

type AtletaAvatarBlocoProps = AtletaAvatarProps & {
  /**
   * Cor fixa pro avatar de iniciais (quando não há foto), sobrepondo a cor semi-aleatória por nome
   * de `corAvatar`. Usado onde o fundo da foto precisa ser padronizado (ex.: grade de "Atletas da
   * Base" — pedido do cliente pra não ter uma cor diferente por atleta). Sem essa prop, mantém o
   * comportamento de sempre (cor por nome) — é o caso de "Meus Atletas" do treinador, que já foi
   * aprovado assim.
   */
  corFallback?: { bg: string; texto: string };
  /**
   * Fundo com o degradê/curvas grená do estúdio de foto oficial (recriado por SVG — ver
   * `FundoEstudioAtleta` abaixo), em vez de cor lisa — pra padronizar o visual de quem ainda não
   * tirou a foto oficial com o dos demais atletas. Só tem efeito junto de `corFallback`/sem foto
   * cadastrada; com foto real, o fundo já é a própria foto do atleta.
   */
  comFundoEstudio?: boolean;
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

export function AtletaAvatarBloco({
  nome,
  fotoUrl,
  className = "aspect-square w-full",
  corFallback,
  comFundoEstudio,
}: AtletaAvatarBlocoProps) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fotoUrl} alt={nome} className={`${className} rounded-t-lg object-cover`} />
    );
  }
  const cor = corFallback ?? corAvatar(nome);
  return (
    <div
      className={`${className} relative flex items-center justify-center overflow-hidden rounded-t-lg ${cor.bg} ${cor.texto} text-3xl font-extrabold`}
    >
      {comFundoEstudio ? <FundoEstudioAtleta nome={nome} /> : null}
      <span className="relative">{iniciaisNome(nome)}</span>
    </div>
  );
}

/**
 * Degradê grená com curvas suaves, recriando por SVG o fundo do estúdio de foto oficial dos
 * atletas (referência enviada pelo cliente) — usado atrás das iniciais de quem ainda não tem foto
 * cadastrada, pra ficar visualmente parecido com o fundo das fotos reais. Os ids dos elementos
 * `<defs>` levam o nome do atleta pra não colidir quando várias instâncias aparecem juntas numa
 * grade (ids de SVG são globais no documento).
 */
function FundoEstudioAtleta({ nome }: { nome: string }) {
  const sufixo = nome.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <radialGradient id={`fundo-glow-${sufixo}`} cx="18%" cy="18%" r="85%">
          <stop offset="0%" stopColor="#9E2462" />
          <stop offset="40%" stopColor="#7A1650" />
          <stop offset="100%" stopColor="#48122F" />
        </radialGradient>
        <filter id={`fundo-blur-${sufixo}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <rect width="300" height="400" fill={`url(#fundo-glow-${sufixo})`} />
      <g filter={`url(#fundo-blur-${sufixo})`}>
        <path d="M -60 260 C 40 160, 160 340, 380 160" stroke="#ffffff" strokeWidth="46" fill="none" opacity="0.16" />
        <path d="M -90 160 C 10 60, 150 260, 380 30" stroke="#ffffff" strokeWidth="34" fill="none" opacity="0.14" />
        <path d="M -70 340 C 60 230, 190 420, 360 230" stroke="#2A0620" strokeWidth="60" fill="none" opacity="0.3" />
        <path d="M -50 60 C 60 10, 140 120, 340 -20" stroke="#2A0620" strokeWidth="40" fill="none" opacity="0.22" />
      </g>
    </svg>
  );
}
