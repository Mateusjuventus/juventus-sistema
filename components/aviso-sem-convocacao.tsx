import Link from "next/link";

/**
 * Aviso mostrado nas abas de Rooming List, Ônibus, Credenciamento e Recibo quando o jogo ainda não
 * tem convocação. `convocacaoHref` é opcional (default `/jogos/${jogoId}/convocacao`) — o Futebol
 * de Base passa o caminho com o prefixo `/base/jogos/[id]/convocacao`, já que essas rotas não
 * seguem o mesmo padrão do Profissional.
 */
export function AvisoSemConvocacao({
  jogoId,
  convocacaoHref,
}: {
  jogoId: string;
  convocacaoHref?: string;
}) {
  return (
    <div className="card mt-4 p-8 text-center">
      <p className="text-neutral-600">
        Monte a convocação deste jogo primeiro — esta parte é organizada a partir de quem foi convocado.
      </p>
      <Link href={convocacaoHref ?? `/jogos/${jogoId}/convocacao`} className="btn-primary mt-4 inline-flex">
        Ir para a Convocação
      </Link>
    </div>
  );
}
