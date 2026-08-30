/**
 * Avatar colorido de iniciais — usado como retrato de um atleta/candidato quando ele ainda não tem
 * foto cadastrada (`foto_path`). Mesmo espírito de avatares de iniciais já usados em produtos como
 * Slack/GitHub: a cor não é decoração, ajuda a diferenciar rapidamente pessoas numa lista longa
 * (Convocação, "Meus Atletas", candidatos da Captação) só de bater o olho, sem precisar ler o nome
 * inteiro. A cor é sempre a mesma pra uma mesma pessoa (hash determinístico do nome), então ela não
 * "pisca" trocando de cor a cada novo carregamento da tela.
 *
 * Foto real sempre tem prioridade — isso aqui é só o retrato de fallback, ver `AtletaAvatar` em
 * `components/atleta-avatar.tsx`.
 */

const PALETA_AVATAR: { bg: string; texto: string }[] = [
  { bg: "bg-[#7A2048]", texto: "text-white" }, // vinho
  { bg: "bg-[#9C7A1F]", texto: "text-white" }, // dourado escuro
  { bg: "bg-[#54677A]", texto: "text-white" }, // azul-acinzentado
  { bg: "bg-[#6B4A34]", texto: "text-white" }, // marrom
  { bg: "bg-[#3E4A5C]", texto: "text-white" }, // azul-marinho
  { bg: "bg-[#A15A3C]", texto: "text-white" }, // terracota
  { bg: "bg-[#5B3A66]", texto: "text-white" }, // roxo
  { bg: "bg-[#3F6B4A]", texto: "text-white" }, // verde
];

/** Duas letras pra representar o nome quando não há foto — primeira letra do primeiro nome +
 * primeira letra do último nome (nome de uma palavra só usa as duas primeiras letras dela). */
export function iniciaisNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Escolhe uma cor da paleta a partir do nome — soma o código de cada caractere e usa o resto da
 * divisão pelo tamanho da paleta, então a mesma pessoa sempre cai na mesma cor. */
export function corAvatar(nomeCompleto: string): { bg: string; texto: string } {
  let soma = 0;
  for (let i = 0; i < nomeCompleto.length; i += 1) {
    soma += nomeCompleto.charCodeAt(i);
  }
  return PALETA_AVATAR[soma % PALETA_AVATAR.length];
}
