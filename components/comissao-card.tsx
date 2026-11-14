import Link from "next/link";

/**
 * Card de pessoa da Comissão Técnica/Diretoria, usado na grade de `app/comissao-tecnica/page.tsx`
 * — pedido do Mateus em 14/11/2026 (item 8, ponto 6): "listagem vira cards". Deliberadamente mais
 * simples que `AtletaCard` (components/atletas/atleta-card.tsx) — sem anel de classificação, sigla
 * de posição, nem selo de vencimento de contrato, que não fazem sentido aqui — já que o pedido foi
 * só sobre o padrão de interação (card → tela "Ver"), não sobre replicar o visual do atleta.
 * O card inteiro é um `<Link>` pra `/comissao-tecnica/[id]/ver` (mesmo padrão "card inteiro
 * clicável" do `AtletaCard`), sem nenhum controle interativo próprio dentro — por isso não há mais
 * um botão de excluir na listagem (ação que passa a viver só na tela "Ver", se for o caso).
 */
export function ComissaoCard({
  id,
  nome,
  apelido,
  fotoUrl,
  funcao,
  setorLabel,
  ativo,
}: {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  funcao: string;
  setorLabel: string | null;
  ativo: boolean;
}) {
  const nomeExibido = apelido || nome;

  return (
    <Link
      href={`/comissao-tecnica/${id}/ver`}
      className={`flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        ativo ? "" : "grayscale opacity-70"
      }`}
    >
      <div className="relative aspect-square w-full bg-neutral-100">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt={nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-neutral-300">
            {nomeExibido.charAt(0).toUpperCase()}
          </div>
        )}
        {!ativo ? (
          <span className="absolute right-1.5 top-1.5 rounded bg-neutral-700/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Inativo
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-neutral-800">{nomeExibido}</p>
        <p className="truncate text-xs text-neutral-500">{funcao}</p>
        {setorLabel ? (
          <span className="mt-1.5 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
            {setorLabel}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
