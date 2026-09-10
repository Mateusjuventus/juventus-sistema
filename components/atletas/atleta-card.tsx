import Link from "next/link";
import { AtletaAvatarBloco } from "@/components/atleta-avatar";
import { formatCPF } from "@/lib/validation/cpf";
import { categoriaDaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import { anelClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";
import { corContratoAtleta, inicialContratoAtleta, labelContratoAtleta } from "@/lib/futebol/contrato-atleta";
import { contratoEstaVencendo, diasParaVencerContrato, formatDataBR } from "@/lib/futebol/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import type { AtletaBaseTipoContrato, AtletaClassificacao } from "@/lib/supabase/types";

export interface AtletaCardDados {
  id: string;
  /** Nome completo — usado pro documento (junto de CPF, no bloco escuro) e como fallback da faixa
   * de cima quando não há apelido cadastrado (ver `nomeExibido`). */
  nome: string;
  /** Como o atleta é chamado no dia a dia — quando existe, é o que aparece na faixa clara logo
   * abaixo da foto (pedido do Mateus em 2026-09-10: a faixa antes mostrava o nome completo, mas o
   * apelido é mais rápido de reconhecer numa grade de cards). `null` cai pro nome completo mesmo
   * (`nomeExibido`), igual já acontece em listas/pôsteres do sistema. */
  apelido: string | null;
  cpf: string | null;
  fotoUrl: string | null;
  dataNascimento: string | null;
  dataFimContrato: string | null;
  tipoContrato: AtletaBaseTipoContrato | null;
  posicao: string;
  numeroCamisa: number | null;
  /** Só existe na Base ("Dispensado" não é status possível no Profissional) — decide o texto
   * "Encerrado em" no lugar de "Contrato até", e desliga o alerta "a vencer". */
  dispensado: boolean;
  /** G1/G2/G3/Dispensa (pendente) — só existe na Base; `undefined`/`null` no Profissional, sem
   * nenhuma borda extra no card. */
  classificacao?: AtletaClassificacao | null;
}

/**
 * Card compartilhado de atleta (Base e Profissional) — foto-forward, com selo de tipo de contrato
 * e alerta de "a vencer" nos cantos de baixo da foto (sigla de posição/número da camisa já ocupam
 * os cantos de cima), faixa fina com o nome, e bloco com nascimento/CPF/contrato (ver
 * docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-design.md, itens 7-9 e a correção de
 * conflito de posição na foto na seção 2).
 */
export function AtletaCard({
  atleta,
  href,
  hoje = new Date(),
}: {
  atleta: AtletaCardDados;
  href: string;
  /** Injetável só pra teste — no app real é sempre "agora". */
  hoje?: Date;
}) {
  const sigla = siglaCategoriaPosicao(categoriaDaPosicao(atleta.posicao));
  const vencendo = contratoEstaVencendo(atleta.dataFimContrato, atleta.dispensado, hoje);
  const diasParaVencer = diasParaVencerContrato(atleta.dataFimContrato, hoje);
  const apelidoOuNome = nomeExibido({ apelido: atleta.apelido, nome_completo: atleta.nome });

  return (
    <Link
      href={href}
      className={`block overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${anelClassificacaoAtleta(
        atleta.classificacao,
      )}`}
    >
      <div className="relative">
        <AtletaAvatarBloco
          nome={atleta.nome}
          fotoUrl={atleta.fotoUrl}
          className="aspect-[3/4] w-full"
          corFallback={{ bg: "bg-grena", texto: "text-white" }}
          comFundoEstudio
        />
        <span className="absolute left-2 top-1.5 text-xs font-bold text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_0.6)]">
          {sigla}
        </span>
        {atleta.numeroCamisa ? (
          <span className="absolute right-2 top-1.5 text-xs font-bold text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_0.6)]">
            {atleta.numeroCamisa}
          </span>
        ) : null}
        {atleta.tipoContrato ? (
          <span
            className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-extrabold text-white shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
            style={{ backgroundColor: corContratoAtleta(atleta.tipoContrato) }}
            title={labelContratoAtleta(atleta.tipoContrato)}
          >
            {inicialContratoAtleta(atleta.tipoContrato)}
          </span>
        ) : null}
        {vencendo ? (
          <span
            className="absolute bottom-1.5 right-1.5 whitespace-nowrap rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-800 shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            title={
              diasParaVencer !== null
                ? `Contrato vence em ${diasParaVencer} dia${diasParaVencer === 1 ? "" : "s"}`
                : undefined
            }
          >
            a vencer
          </span>
        ) : null}
      </div>

      {/* Faixa com o apelido (como o atleta é chamado no dia a dia) — cai pro nome completo quando
          não há apelido cadastrado (`nomeExibido`). Fundo cinza claro (voltou a ser assim, era a cor
          original da faixa antes do redesign — pedido do Mateus em 2026-09-10) em vez do tom
          grená translúcido usado no meio do caminho. */}
      <div className="line-clamp-2 min-h-[1.5rem] break-words bg-neutral-100 px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight text-grena-escuro">
        {apelidoOuNome}
      </div>

      <div className="bg-grena-escuro px-2 py-2">
        {/* Nome completo — fica junto do CPF por ser o par que documento pede (mesmo raciocínio de
            `lib/futebol/nome-atleta.ts`: apelido é pra reconhecer rápido, nome completo é pro
            registro formal). Repete o texto da faixa de cima quando o atleta não tem apelido, o que
            é esperado (não há apelido, então "quem é" e "nome completo" são o mesmo texto mesmo). */}
        <p className="line-clamp-1 break-words text-center text-[9px] font-semibold leading-tight text-white/90">
          {atleta.nome}
        </p>
        <p className="mt-1 text-center text-xs font-bold leading-tight text-white">{formatDataBR(atleta.dataNascimento)}</p>
        <p className="mt-0.5 min-h-[1.4rem] whitespace-nowrap text-center text-[10px] leading-tight text-white/75">
          CPF {atleta.cpf ? formatCPF(atleta.cpf) : "—"}
        </p>
        <p className="min-h-[1.4rem] text-center text-[10px] leading-tight text-white/75">
          {atleta.dispensado ? "Encerrado em " : "Contrato até "}
          {formatDataBR(atleta.dataFimContrato)}
        </p>
      </div>
    </Link>
  );
}
