import Link from "next/link";

/** Aviso mostrado nas abas de Rooming List, Ônibus, Credenciamento e Recibo quando o jogo ainda não tem convocação. */
export function AvisoSemConvocacao({ jogoId }: { jogoId: string }) {
  return (
    <div className="card mt-4 p-8 text-center">
      <p className="text-neutral-600">
        Monte a convocação deste jogo primeiro — esta parte é organizada a partir de quem foi convocado.
      </p>
      <Link href={`/jogos/${jogoId}/convocacao`} className="btn-primary mt-4 inline-flex">
        Ir para a Convocação
      </Link>
    </div>
  );
}
