/**
 * Mapa esquemático do Brasil por estado, usado no dashboard da Captação (`/base/captacao/dashboard`)
 * pra mostrar de onde vêm os candidatos. Em vez de desenhar as fronteiras de cada UF (um SVG grande
 * e frágil de manter), cada estado vira um ponto posicionado pela latitude/longitude aproximada da
 * capital — a nuvem de 27 pontos já desenha o contorno do país de forma reconhecível, e o tamanho/
 * cor de cada ponto reflete a quantidade de candidatos. É uma projeção simples (equirretangular),
 * não uma carta náutica: serve pra enxergar "de onde vem a maior parte da captação", não pra medir
 * distância no mapa.
 */

export interface EstadoCoordenada {
  uf: string;
  nome: string;
  /** Latitude/longitude aproximada da capital — o suficiente pra posicionar o ponto no mapa
   * esquemático, não para uso cartográfico. */
  lat: number;
  long: number;
}

export const ESTADOS_BRASIL: EstadoCoordenada[] = [
  { uf: "AC", nome: "Acre", lat: -9.97, long: -67.8 },
  { uf: "AL", nome: "Alagoas", lat: -9.66, long: -35.7 },
  { uf: "AP", nome: "Amapá", lat: 0.03, long: -51.07 },
  { uf: "AM", nome: "Amazonas", lat: -3.1, long: -60.0 },
  { uf: "BA", nome: "Bahia", lat: -12.97, long: -38.5 },
  { uf: "CE", nome: "Ceará", lat: -3.73, long: -38.5 },
  { uf: "DF", nome: "Distrito Federal", lat: -15.78, long: -47.9 },
  { uf: "ES", nome: "Espírito Santo", lat: -20.32, long: -40.3 },
  { uf: "GO", nome: "Goiás", lat: -16.68, long: -49.25 },
  { uf: "MA", nome: "Maranhão", lat: -2.53, long: -44.3 },
  { uf: "MT", nome: "Mato Grosso", lat: -15.6, long: -56.1 },
  { uf: "MS", nome: "Mato Grosso do Sul", lat: -20.44, long: -54.6 },
  { uf: "MG", nome: "Minas Gerais", lat: -19.92, long: -43.9 },
  { uf: "PA", nome: "Pará", lat: -1.46, long: -48.5 },
  { uf: "PB", nome: "Paraíba", lat: -7.12, long: -34.86 },
  { uf: "PR", nome: "Paraná", lat: -25.43, long: -49.27 },
  { uf: "PE", nome: "Pernambuco", lat: -8.05, long: -34.9 },
  { uf: "PI", nome: "Piauí", lat: -5.09, long: -42.8 },
  { uf: "RJ", nome: "Rio de Janeiro", lat: -22.9, long: -43.2 },
  { uf: "RN", nome: "Rio Grande do Norte", lat: -5.79, long: -35.2 },
  { uf: "RS", nome: "Rio Grande do Sul", lat: -30.03, long: -51.2 },
  { uf: "RO", nome: "Rondônia", lat: -8.76, long: -63.9 },
  { uf: "RR", nome: "Roraima", lat: 2.82, long: -60.67 },
  { uf: "SC", nome: "Santa Catarina", lat: -27.6, long: -48.55 },
  { uf: "SP", nome: "São Paulo", lat: -23.55, long: -46.63 },
  { uf: "SE", nome: "Sergipe", lat: -10.91, long: -37.07 },
  { uf: "TO", nome: "Tocantins", lat: -10.25, long: -48.32 },
];

const LAT_MIN = Math.min(...ESTADOS_BRASIL.map((e) => e.lat));
const LAT_MAX = Math.max(...ESTADOS_BRASIL.map((e) => e.lat));
const LONG_MIN = Math.min(...ESTADOS_BRASIL.map((e) => e.long));
const LONG_MAX = Math.max(...ESTADOS_BRASIL.map((e) => e.long));

export interface PontoMapa {
  uf: string;
  nome: string;
  x: number;
  y: number;
}

/**
 * Projeta lat/long num retângulo `largura` × `altura` com uma margem em volta (pra o ponto de um
 * estado na borda — RR, AC, RS — não ficar colado na moldura). Latitude cresce pra cima no mundo
 * real mas pra baixo em coordenadas de tela, por isso o eixo Y é invertido.
 */
export function projetarEstados(largura: number, altura: number, margem = 24): PontoMapa[] {
  const areaLargura = largura - margem * 2;
  const areaAltura = altura - margem * 2;
  return ESTADOS_BRASIL.map((e) => {
    const x = margem + ((e.long - LONG_MIN) / (LONG_MAX - LONG_MIN)) * areaLargura;
    const y = margem + ((LAT_MAX - e.lat) / (LAT_MAX - LAT_MIN)) * areaAltura;
    return { uf: e.uf, nome: e.nome, x, y };
  });
}
