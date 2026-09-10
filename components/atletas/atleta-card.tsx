import Link from "next/link";
import { AtletaAvatarBloco } from "@/components/atleta-avatar";
import { formatCPF } from "@/lib/validation/cpf";
import { categoriaDaPosicao, siglaCategoriaPosicao } from "@/lib/futebol/categoria-posicao";
import { anelClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";
import { corContratoAtleta, inicialContratoAtleta, labelContratoAtleta } from "@/lib/futebol/contrato-atleta";
import { contratoEstaVencendo, diasParaVencerContrato, formatDataBR } from "@/lib/futebol/atleta-card";
import type { AtletaBaseTipoContrato, AtletaClassificacao } from "@/lib/supabase/types";

export interface AtletaCardDados {
  id: string;
  nome: string;
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
          className="aspect-square w-full"
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

      <div className="line-clamp-2 break-words bg-grena/35 px-2 py-1 text-center text-[11px] font-bold leading-tight text-grena-escuro">
        {atleta.nome}
      </div>

      <div className="bg-grena-escuro px-2.5 py-2.5">
        <p className="text-center text-sm font-bold leading-tight text-white">{formatDataBR(atleta.dataNascimento)}</p>
        <p className="mt-1 text-center text-[11px] leading-tight text-white/75">
          CPF {atleta.cpf ? formatCPF(atleta.cpf) : "—"}
        </p>
        <p className="text-center text-[11px] leading-tight text-white/75">
          {atleta.dispensado ? "Encerrado em " : "Contrato até "}
          {formatDataBR(atleta.dataFimContrato)}
        </p>
      </div>
    </Link>
  );
}
